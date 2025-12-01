#pragma once

namespace Nova {

class Renderer {
public:
    static void Init();
    static void Shutdown();
    static void Clear(float r, float g, float b, float a);
};

} // namespace Nova
