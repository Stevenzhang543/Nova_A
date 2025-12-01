#pragma once
#include <string>
#include "Core/Application.h"

class EditorApplication : public Nova::Application
{
public:
    enum class EditorPage { Physics = 0, Renderer };

    EditorApplication(const std::string& title, int width, int height);
    virtual ~EditorApplication();

    virtual void OnImGuiRender() override;

private:
    void RenderMenuBar();
    void RenderSidebar();
    void RenderContentWindow();
    void RenderStatusBar();

    void RenderPhysicsEditor();
    void RenderRendererEditor();

    void SetInitialDockLayout();

private:
    bool m_DockspaceInitialized = false;
    EditorPage m_CurrentPage = EditorPage::Physics;
    std::string m_StatusText = "Ready. Welcome to the Nova Editor.";
};
