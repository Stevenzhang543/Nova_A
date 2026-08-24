MIT License

Copyright (c) 2025 Nova_A

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights  
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell  
copies of the Software, and to permit persons to whom the Software is  
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all  
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR  
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,  
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE  
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER  
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING  
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS  
IN THE SOFTWARE.

## Bundled content policy

Nova_A-authored project templates, tutorial text, icons, reference projects,
fixtures, and reference assets in this distribution are provided under the
same MIT License unless the containing file states a different license. They
are development examples and do not transfer ownership of content that users
import into their own projects. User-imported assets remain under their
authors' licenses.

## Bundled fonts

The following fonts are redistributed under the SIL Open Font License 1.1
(OFL-1.1). The fonts may be used, studied, modified, and redistributed under
that license; modified font files must follow its Reserved Font Name rules.

- Nunito Sans Variable — Copyright 2014 The Nunito Sans Project Authors.
- Noto Sans Simplified Chinese Variable — Copyright 2014–2024 Adobe and the
  Noto Project Authors.
- JetBrains Mono Variable — Copyright 2020 The JetBrains Mono Project Authors.

Verbatim OFL-1.1 text for each family is included in the web package under
`FONT_LICENSES/`, in the source package in the corresponding
`node_modules/@fontsource-variable/*/LICENSE` upstream package when
dependencies are installed, and is hash-verified by
`docs/FONT_LICENSE_VERIFICATION_4_1.md` in the source and release evidence.

## Other redistributed components

Nova_A preserves third-party copyright and license terms. The principal
redistributed runtime components are Vue (MIT), Tauri and its JavaScript/Rust
components (Apache-2.0 OR MIT), and the Rust crates and JavaScript packages
identified by the pinned `Cargo.lock` and `pnpm-lock.yaml` files. Fontsource
package code is MIT while the font binaries retain OFL-1.1. The complete
version and license inventory is recorded in the release-evidence SBOM at
`build/software-bill-of-materials.spdx.json`; authoritative dependency
manifests and upstream license references are included in the source archive.
Nothing in this MIT grant replaces a third party's license for its component.
