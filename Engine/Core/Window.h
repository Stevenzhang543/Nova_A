#pragma once
#include <string>

struct GLFWwindow;

namespace Nova {

class Window
{
public:
    Window(int width = 1280, int height = 720, const std::string& title = "Nova_A");
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

} // namespace Nova
