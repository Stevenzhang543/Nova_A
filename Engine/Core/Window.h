#pragma once
#include <string>

struct GLFWwindow;

namespace Nova {

    class Window
    {
    public:
        Window(int width, int height, const std::string& title);
        ~Window();

        void PollEvents();
        void SwapBuffers();

        bool ShouldClose() const;
        GLFWwindow* GetNativeWindow() const;

    private:
        void Init();

    private:
        int m_Width, m_Height;
        std::string m_Title;
        GLFWwindow* m_Window = nullptr;
    };
}