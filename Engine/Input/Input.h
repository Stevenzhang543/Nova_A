// Engine/Input/Input.h
#pragma once
#include <GLFW/glfw3.h>

namespace Nova {

    namespace Input {

        inline bool IsKeyDown(int key)
        {
            GLFWwindow* w = glfwGetCurrentContext();
            if (!w) return false;
            return glfwGetKey(w, key) == GLFW_PRESS;
        }
    }

} // namespace Nova