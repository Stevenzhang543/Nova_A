// Engine/Core/Window.cpp
#include "Window.h"
#include <stdexcept> 

#include <glad/glad.h>
#include <GLFW/glfw3.h>

#include <iostream>

namespace Nova {

    static void GLFWErrorCallback(int error, const char* description)
    {
        std::cerr << "[GLFW Error] (" << error << "): " << description << std::endl;
    }

    Window::Window(int width, int height, const std::string& title)
        : m_Width(width), m_Height(height), m_Title(title)
    {
        Init();
    }

    Window::~Window()
    {
        glfwDestroyWindow(m_Window);
    }

    void Window::Init()
    {
        glfwSetErrorCallback(GLFWErrorCallback);

        m_Window = glfwCreateWindow(m_Width, m_Height, m_Title.c_str(), nullptr, nullptr);
        if (!m_Window)
        {
            throw std::runtime_error("Failed to create GLFW window!");
        }

        glfwMakeContextCurrent(m_Window);

        if (!gladLoadGLLoader((GLADloadproc)glfwGetProcAddress))
        {
            throw std::runtime_error("Failed to initialize GLAD!");
        }

        glfwSwapInterval(1); // Enable v-sync
    }

    void Window::PollEvents()
    {
        glfwPollEvents();
    }

    void Window::SwapBuffers()
    {
        glfwSwapBuffers(m_Window);
    }

    bool Window::ShouldClose() const
    {
        return glfwWindowShouldClose(m_Window);
    }

    GLFWwindow* Window::GetNativeWindow() const
    {
        return m_Window;
    }
}