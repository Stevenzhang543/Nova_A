// Engine/Core/Application.h
#pragma once

#include <memory>
#include <string>

// FIX: Forward declare Window inside its namespace for consistency.
// We must declare 'class Window;' outside of the Nova namespace, 
// then use the qualified name inside Application if Window is in Nova namespace.
namespace Nova { class Window; }


namespace Nova {

    class Application {
    public:
        Application(const std::string& title = "Nova_A", int width = 1280, int height = 720);
        ~Application();

        void Run();

    protected:
        virtual void OnUpdate(float dt) {}
        virtual void OnRender() {}

    private:
        void InitGLFWAndGLAD();
        void InitImGui();
        void ShutdownImGui();

    private:
        // FIX: Must use Nova::Window if Window is inside Nova namespace
        std::unique_ptr<Nova::Window> m_Window;
        std::string m_Title;
        int m_Width;
        int m_Height;
        bool m_Running = false;
        float m_ClearColor[4]{ 0.1f, 0.12f, 0.15f, 1.0f };
    };

} // namespace Nova