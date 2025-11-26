# Build Guide — Nova_A

## Requirements

| Tool | Version |
|------|---------|
| Windows 11 | Required |
| Visual Studio 2022 | Latest |
| CMake | 3.22+ |
| Windows SDK | 10+ |
| Graphics API | DirectX11 or Vulkan SDK |

---

## Building

### 1. Clone
git clone https://github.com/yourname/Nova_A
cd Nova_A

### 2. Generate Project
cmake -B build -G "Visual Studio 17 2022"

### 3. Build
Open `build/Nova_A.sln` and press **Build**.

---

## Run
The executable will be under:  
build/bin/
