// 26.44 宽相：动态 AABB 树（参考 Box2D b2DynamicTree）。
//
// Each body has one leaf holding a "fat" box: its bounds enlarged by the distance it can travel
// in the step, the speculative distance and a fixed margin. A leaf is only re-inserted when the
// body leaves its fat box, so resting and static bodies (a whole TileMap) cost nothing per step.
// Pairs are found by querying the tree for every body that can move, carries a sensor or was
// moved since the last step; bodies at rest never query (26.44: sleeping bodies included). Insertion picks the sibling with the smallest area growth and the tree is
// kept balanced with AVL rotations, so queries stay O(log n).

const TREE_NULL: usize = usize::MAX;
// Extra room around a body's box, so small motions do not re-insert the leaf (Box2D: 0.1 m).
const AABB_MARGIN: f64 = 0.1;

#[derive(Clone, Copy, Debug)]
struct TreeNode {
    bounds: Aabb,
    parent: usize,
    child_1: usize,
    child_2: usize,
    height: i32,
    body: usize,
}

impl TreeNode {
    // 是否为叶节点。
    fn is_leaf(&self) -> bool {
        self.child_1 == TREE_NULL
    }
}

// 两个包围盒的并集。
fn aabb_union(first: Aabb, second: Aabb) -> Aabb {
    Aabb {
        min_x: first.min_x.min(second.min_x),
        max_x: first.max_x.max(second.max_x),
        min_y: first.min_y.min(second.min_y),
        max_y: first.max_y.max(second.max_y),
    }
}

// 包围盒周长（二维中的表面积启发式）。
fn aabb_perimeter(bounds: Aabb) -> f64 {
    2.0 * ((bounds.max_x - bounds.min_x) + (bounds.max_y - bounds.min_y))
}

// outer 是否完全包含 inner。
fn aabb_contains(outer: Aabb, inner: Aabb) -> bool {
    outer.min_x <= inner.min_x && outer.min_y <= inner.min_y && outer.max_x >= inner.max_x && outer.max_y >= inner.max_y
}

#[derive(Clone, Debug, Default)]
struct BroadPhaseTree {
    nodes: Vec<TreeNode>,
    free: Vec<usize>,
    root: usize,
    /// Leaf of each body (by body index), TREE_NULL when not inserted.
    leaves: Vec<usize>,
    /// Statistics of the last update, for benchmarks and diagnostics.
    reinserted: usize,
}

impl BroadPhaseTree {
    // 空树。
    fn new() -> Self {
        Self { nodes: Vec::new(), free: Vec::new(), root: TREE_NULL, leaves: Vec::new(), reinserted: 0 }
    }

    // 分配一个节点。
    fn allocate(&mut self, node: TreeNode) -> usize {
        if let Some(index) = self.free.pop() {
            self.nodes[index] = node;
            index
        } else {
            self.nodes.push(node);
            self.nodes.len() - 1
        }
    }

    // 插入叶节点并沿路径重算包围盒与高度。
    fn insert_leaf(&mut self, leaf: usize) {
        if self.root == TREE_NULL {
            self.root = leaf;
            self.nodes[leaf].parent = TREE_NULL;
            return;
        }
        let leaf_bounds = self.nodes[leaf].bounds;
        // Descend toward the cheapest sibling (area growth heuristic).
        let mut index = self.root;
        while !self.nodes[index].is_leaf() {
            let node = self.nodes[index];
            let area = aabb_perimeter(node.bounds);
            let combined = aabb_perimeter(aabb_union(node.bounds, leaf_bounds));
            let cost = 2.0 * combined;
            let inheritance = 2.0 * (combined - area);
            let child_cost = |child: usize| {
                let child_node = self.nodes[child];
                let union = aabb_perimeter(aabb_union(child_node.bounds, leaf_bounds));
                if child_node.is_leaf() {
                    union + inheritance
                } else {
                    union - aabb_perimeter(child_node.bounds) + inheritance
                }
            };
            let cost_1 = child_cost(node.child_1);
            let cost_2 = child_cost(node.child_2);
            if cost < cost_1 && cost < cost_2 {
                break;
            }
            index = if cost_1 < cost_2 { node.child_1 } else { node.child_2 };
        }
        let sibling = index;
        let old_parent = self.nodes[sibling].parent;
        let new_parent = self.allocate(TreeNode {
            bounds: aabb_union(leaf_bounds, self.nodes[sibling].bounds),
            parent: old_parent,
            child_1: sibling,
            child_2: leaf,
            height: self.nodes[sibling].height + 1,
            body: usize::MAX,
        });
        if old_parent == TREE_NULL {
            self.root = new_parent;
        } else if self.nodes[old_parent].child_1 == sibling {
            self.nodes[old_parent].child_1 = new_parent;
        } else {
            self.nodes[old_parent].child_2 = new_parent;
        }
        self.nodes[sibling].parent = new_parent;
        self.nodes[leaf].parent = new_parent;
        self.refit_from(self.nodes[leaf].parent);
    }

    // 移除叶节点，兄弟节点接替父节点位置。
    fn remove_leaf(&mut self, leaf: usize) {
        if leaf == self.root {
            self.root = TREE_NULL;
            return;
        }
        let parent = self.nodes[leaf].parent;
        let grand_parent = self.nodes[parent].parent;
        let sibling = if self.nodes[parent].child_1 == leaf { self.nodes[parent].child_2 } else { self.nodes[parent].child_1 };
        if grand_parent == TREE_NULL {
            self.root = sibling;
            self.nodes[sibling].parent = TREE_NULL;
        } else {
            if self.nodes[grand_parent].child_1 == parent {
                self.nodes[grand_parent].child_1 = sibling;
            } else {
                self.nodes[grand_parent].child_2 = sibling;
            }
            self.nodes[sibling].parent = grand_parent;
            self.refit_from(grand_parent);
        }
        self.free.push(parent);
    }

    // 从节点向上平衡并重算包围盒与高度。
    fn refit_from(&mut self, mut index: usize) {
        while index != TREE_NULL {
            index = self.balance(index);
            let child_1 = self.nodes[index].child_1;
            let child_2 = self.nodes[index].child_2;
            self.nodes[index].height = 1 + self.nodes[child_1].height.max(self.nodes[child_2].height);
            self.nodes[index].bounds = aabb_union(self.nodes[child_1].bounds, self.nodes[child_2].bounds);
            index = self.nodes[index].parent;
        }
    }

    // AVL 旋转：子树高度差超过 1 时把较高的孙节点提升（Box2D b2DynamicTree::Balance）。
    fn balance(&mut self, a: usize) -> usize {
        if self.nodes[a].is_leaf() || self.nodes[a].height < 2 {
            return a;
        }
        let b = self.nodes[a].child_1;
        let c = self.nodes[a].child_2;
        let difference = self.nodes[c].height - self.nodes[b].height;
        if difference > 1 {
            return self.rotate_up(a, c, b, true);
        }
        if difference < -1 {
            return self.rotate_up(a, b, c, false);
        }
        a
    }

    // 把较高子节点 high 提升到 a 的位置；low 是 a 的另一子节点。
    fn rotate_up(&mut self, a: usize, high: usize, low: usize, high_is_child_2: bool) -> usize {
        let f = self.nodes[high].child_1;
        let g = self.nodes[high].child_2;
        // Swap a and high.
        self.nodes[high].child_1 = a;
        self.nodes[high].parent = self.nodes[a].parent;
        self.nodes[a].parent = high;
        let parent = self.nodes[high].parent;
        if parent == TREE_NULL {
            self.root = high;
        } else if self.nodes[parent].child_1 == a {
            self.nodes[parent].child_1 = high;
        } else {
            self.nodes[parent].child_2 = high;
        }
        // Keep the taller grandchild under `high`, give the other one to `a`.
        let (keep, give) = if self.nodes[f].height > self.nodes[g].height { (f, g) } else { (g, f) };
        self.nodes[high].child_2 = keep;
        if high_is_child_2 {
            self.nodes[a].child_2 = give;
        } else {
            self.nodes[a].child_1 = give;
        }
        self.nodes[give].parent = a;
        self.nodes[a].bounds = aabb_union(self.nodes[low].bounds, self.nodes[give].bounds);
        self.nodes[high].bounds = aabb_union(self.nodes[a].bounds, self.nodes[keep].bounds);
        self.nodes[a].height = 1 + self.nodes[low].height.max(self.nodes[give].height);
        self.nodes[high].height = 1 + self.nodes[a].height.max(self.nodes[keep].height);
        high
    }

    // 收集与 bounds 相交的叶（刚体索引）。
    fn query(&self, bounds: Aabb, found: &mut Vec<usize>) {
        if self.root == TREE_NULL {
            return;
        }
        let mut stack = vec![self.root];
        while let Some(index) = stack.pop() {
            let node = &self.nodes[index];
            if !node.bounds.overlaps(bounds) {
                continue;
            }
            if node.is_leaf() {
                found.push(node.body);
            } else {
                stack.push(node.child_1);
                stack.push(node.child_2);
            }
        }
    }

    // 更新每个刚体的叶（离开胖包围盒时重插），返回本步候选刚体对（较小索引在前，已排序）。
    // 26.44: only bodies marked in `querying` (moving, or moved since the last step) query the
    // tree and need their leaf refreshed; resting bodies are only found by them.
    fn update_pairs(&mut self, bodies: &[Body], reaches: &[f64], speculative: f64, querying: &[bool]) -> Vec<(usize, usize)> {
        if self.leaves.len() != bodies.len() {
            *self = Self::new();
            self.leaves = vec![TREE_NULL; bodies.len()];
        }
        self.reinserted = 0;
        let tight_bounds = |index: usize| inflate_aabb(bodies[index].compound_aabb(), reaches[index] + speculative);
        let mut tight: Vec<Option<Aabb>> = vec![None; bodies.len()];
        for index in 0..bodies.len() {
            let leaf = self.leaves[index];
            if leaf != TREE_NULL && !querying[index] {
                continue;
            }
            let bounds = tight_bounds(index);
            tight[index] = Some(bounds);
            if leaf != TREE_NULL && aabb_contains(self.nodes[leaf].bounds, bounds) {
                continue;
            }
            if leaf != TREE_NULL {
                self.remove_leaf(leaf);
                self.free.push(leaf);
            }
            let fat = inflate_aabb(bounds, AABB_MARGIN);
            let new_leaf = self.allocate(TreeNode { bounds: fat, parent: TREE_NULL, child_1: TREE_NULL, child_2: TREE_NULL, height: 0, body: index });
            self.leaves[index] = new_leaf;
            self.insert_leaf(new_leaf);
            self.reinserted += 1;
        }
        let mut pairs = Vec::new();
        let mut found = Vec::new();
        for index in 0..bodies.len() {
            if !querying[index] {
                continue;
            }
            let Some(bounds) = tight[index] else {
                continue;
            };
            found.clear();
            self.query(bounds, &mut found);
            for &other in &found {
                // Both querying bodies find each other: keep the pair from the lower index only.
                if other == index || (querying[other] && other < index) {
                    continue;
                }
                let other_bounds = tight[other].unwrap_or_else(|| tight_bounds(other));
                if !other_bounds.overlaps(bounds) {
                    continue;
                }
                pairs.push((index.min(other), index.max(other)));
            }
        }
        pairs.sort_unstable();
        pairs.dedup();
        pairs
    }
}
