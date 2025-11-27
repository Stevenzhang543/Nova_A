// Engine/Core/Application.cpp
#include "Application.h"
#include "Window.h" // FIX: Explicitly include Window definition
#include "Graphics/Renderer.h"
#include "Input/Input.h"

#include <iostream>
#include <chrono>

#include <imgui.h>
#include <backends/imgui_impl_glfw.h>
#include <backends/imgui_impl_opengl3.h>

namespace Nova {

    Application::Application(const std::string& title, int width, int height)
        : m_Title(title), m_Width(width), m_Height(height)
    {
        InitGLFWAndGLAD();

        // FIX: std::make_unique<Window> is correct because we are inside Nova namespace.
        // The type matches the unique_ptr type in Application.h (std::unique_ptr<Nova::Window>)
        m_Window = std::make_unique<Window>(m_Width, m_Height, m_Title);

        InitImGui();
        Renderer::Init();

        m_Running = true;
    }

    Application::~Application()
    {
        ShutdownImGui();
        Renderer::Shutdown();
        m_Window.reset();

        // Terminate GLFW here
        glfwTerminate();
    }

    void Application::InitGLFWAndGLAD()
    {
        if (!glfwInit()) {
            throw std::runtime_error("Failed to initialize GLFW");
        }

        glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
        glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
        glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
    }

    void Application::InitImGui()
    {
        IMGUI_CHECKVERSION();
        ImGui::CreateContext();
        ImGui::StyleColorsDark();

        ImGui_ImplGlfw_InitForOpenGL(m_Window->GetNativeWindow(), true);
        ImGui_ImplOpenGL3_Init("#version 330");
    }

    void Application::ShutdownImGui()
    {
        ImGui_ImplOpenGL3_Shutdown();
        ImGui_ImplGlfw_Shutdown();
        ImGui::DestroyContext();
    }

    void Application::Run()
    {
        using clock = std::chrono::high_resolution_clock;
        auto last = clock::now();

        while (m_Running && !m_Window->ShouldClose())
        {
            auto now = clock::now();
            std::chrono::duration<float> elapsed = now - last;
            last = now;
            float dt = elapsed.count();

            m_Window->PollEvents();

            OnUpdate(dt);

            ImGui_ImplOpenGL3_NewFrame();
            ImGui_ImplGlfw_NewFrame();
            ImGui::NewFrame();

            ImGui::Begin("Nova_A Editor v0.0.1.4");
            ImGui::Text("Hello, Nova_A!");
            ImGui::Separator();
            ImGui::Text("Press ESC to quit.");
            ImGui::ColorEdit4("Clear Color", m_ClearColor);
            ImGui::Text("Application FPS: %.1f", 1.0f / dt);
            ImGui::End();

            OnRender();

            ImGui::Render();

            int display_w, display_h;
            glfwGetFramebufferSize(m_Window->GetNativeWindow(), &display_w, &display_h);
            glViewport(0, 0, display_w, display_h);
            Renderer::Clear(m_ClearColor[0], m_ClearColor[1], m_ClearColor[2], m_ClearColor[3]);

            ImGui_ImplOpenGL3_RenderDrawData(ImGui::GetDrawData());

            m_Window->SwapBuffers();
        }
    }

} // namespace Nova