// Engine/Graphics/Renderer.cpp
#include "Renderer.h"
#include <glad/glad.h>

namespace Nova {

    void Renderer::Init()
    {
        glEnable(GL_BLEND);
        glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    }

    void Renderer::Shutdown()
    {
        // cleanup resources later (shaders, buffers)
    }

    void Renderer::Clear(float r, float g, float b, float a)
    {
        glClearColor(r, g, b, a);
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    }

} // namespace Nova