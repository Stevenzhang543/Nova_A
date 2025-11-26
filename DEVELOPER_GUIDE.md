# Developer Guide — Nova_A

## Module Architecture

### Core
- Logger  
- Timer  
- Events  
- Application lifecycle  

### Math
- Vec2, Vec3  
- Mat3 (2D transform)  
- Bounding shapes  

### Physics
- RigidBody  
- Colliders  
- Integrators  
- Collision resolution  

### Renderer
- GPU device  
- Draw calls  
- Sprites  
- Materials  

### Editor
- Panels  
- Scene graph  
- Property inspector  
- Runtime preview  

---

## Coding Rules
- Follow C++20 standard  
- Prefer `unique_ptr`  
- Use `const` aggressively  
- Keep modules decoupled  

---

## How to Add a Feature
1. Create a new branch  
2. Implement inside correct module  
3. Add documentation  
4. Add tests  
5. Submit PR  

---

Happy coding!
