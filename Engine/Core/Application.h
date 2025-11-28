#pragma once
#include <memory>
#include <string>

// Forward declare Window in its namespace
namespace Nova { class Window; }


namespace Nova {

    class Application {
    public:
        Application(const std::string& title = "Nova_A", int width = 1280, int height = 720);
        virtual ~Application(); // Make destructor virtual for inheritance

        void Run();

    protected:
        // Override points for future extension
        virtual void OnUpdate(float dt) {}
        virtual void OnImGuiRender(); // <-- ADDED: Main UI rendering override
        virtual void OnRender() {}

        // Protected so child classes can access
        float m_ClearColor[4]{ 0.1f, 0.12f, 0.15f, 1.0f };

    private:
        void InitGLFWAndGLAD();
        void InitImGui();
        void ShutdownImGui();

    private:
        std::unique_ptr<Nova::Window> m_Window;
        std::string m_Title;
        int m_Width;
        int m_Height;
        bool m_Running = false;
    };

} // namespace Nova