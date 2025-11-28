#include <glad/glad.h>
#include "Application.h"
#include "Window.h" 
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
        ImGuiIO& io = ImGui::GetIO(); (void)io;

        // Enable Docking and Viewports
        io.ConfigFlags |= ImGuiConfigFlags_NavEnableKeyboard;
        io.ConfigFlags |= ImGuiConfigFlags_DockingEnable;
        io.ConfigFlags |= ImGuiConfigFlags_ViewportsEnable;

        ImGui::StyleColorsDark();

        // Tweak window styling when viewports are enabled
        ImGuiStyle& style = ImGui::GetStyle();
        if (io.ConfigFlags & ImGuiConfigFlags_ViewportsEnable)
        {
            style.WindowRounding = 0.0f;
            style.Colors[ImGuiCol_WindowBg].w = 1.0f;
        }

        ImGui_ImplGlfw_InitForOpenGL(m_Window->GetNativeWindow(), true);
        ImGui_ImplOpenGL3_Init("#version 330");
    }

    void Application::ShutdownImGui()
    {
        ImGui_ImplOpenGL3_Shutdown();
        ImGui_ImplGlfw_Shutdown();
        ImGui::DestroyContext();
    }

    // Default ImGui Render (can be empty)
    void Application::OnImGuiRender()
    {
        // Base implementation does nothing
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

            // Start the ImGui frame
            ImGui_ImplOpenGL3_NewFrame();
            ImGui_ImplGlfw_NewFrame();
            ImGui::NewFrame();

            // --- Dockspace Setup ---
            // Create a fullscreen, "invisible" window to host the dockspace
            {
                ImGuiWindowFlags window_flags = ImGuiWindowFlags_MenuBar | ImGuiWindowFlags_NoDocking;
                const ImGuiViewport* viewport = ImGui::GetMainViewport();
                ImGui::SetNextWindowPos(viewport->WorkPos);
                ImGui::SetNextWindowSize(viewport->WorkSize);
                ImGui::SetNextWindowViewport(viewport->ID);
                ImGui::PushStyleVar(ImGuiStyleVar_WindowRounding, 0.0f);
                ImGui::PushStyleVar(ImGuiStyleVar_WindowBorderSize, 0.0f);
                window_flags |= ImGuiWindowFlags_NoTitleBar | ImGuiWindowFlags_NoCollapse | ImGuiWindowFlags_NoResize | ImGuiWindowFlags_NoMove;
                window_flags |= ImGuiWindowFlags_NoBringToFrontOnFocus | ImGuiWindowFlags_NoNavFocus;

                // We Push/Pop style vars to make this host window invisible
                ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(0.0f, 0.0f));
                ImGui::Begin("NovaDockspaceHost", nullptr, window_flags);
                ImGui::PopStyleVar();
                ImGui::PopStyleVar(2);

                // Submit the DockSpace
                ImGuiIO& io = ImGui::GetIO();
                if (io.ConfigFlags & ImGuiConfigFlags_DockingEnable)
                {
                    ImGuiID dockspace_id = ImGui::GetID("NovaDockspace");
                    ImGui::DockSpace(dockspace_id, ImVec2(0.0f, 0.0f), ImGuiDockNodeFlags_None);
                }

                // --- Call the Editor's UI rendering function ---
                OnImGuiRender();
                // ---

                ImGui::End();
            }
            // --- End Dockspace ---

            OnRender();

            // Rendering
            ImGui::Render();

            int display_w, display_h;
            glfwGetFramebufferSize(m_Window->GetNativeWindow(), &display_w, &display_h);
            glViewport(0, 0, display_w, display_h);
            Renderer::Clear(m_ClearColor[0], m_ClearColor[1], m_ClearColor[2], m_ClearColor[3]);

            ImGui_ImplOpenGL3_RenderDrawData(ImGui::GetDrawData());

            // Update and Render additional Platform Windows (for viewports)
            ImGuiIO& io = ImGui::GetIO();
            if (io.ConfigFlags & ImGuiConfigFlags_ViewportsEnable)
            {
                GLFWwindow* backup_current_context = glfwGetCurrentContext();
                ImGui::UpdatePlatformWindows();
                ImGui::RenderPlatformWindowsDefault();
                glfwMakeContextCurrent(backup_current_context);
            }

            m_Window->SwapBuffers();
        }
    }

} // namespace Nova