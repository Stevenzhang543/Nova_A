#pragma once
#include "Core/Application.h" // Assumed path for the base Application class
#include <string>

// Enum for managing the content panel view
enum class EditorPage
{
    Physics = 0,
    Renderer
};

class EditorApplication : public Nova::Application
{
public:
    // Constructor and Destructor
    EditorApplication(const std::string& title, int width, int height);
    virtual ~EditorApplication();

    // Core virtual function inherited from Nova::Application
    virtual void OnImGuiRender() override;

private:
    // UI Rendering Functions
    void RenderMenuBar();
    void RenderSidebar();
    void RenderContentWindow();
    void RenderStatusBar();

    // Editor Content Views
    void RenderPhysicsEditor();
    void RenderRendererEditor();

    // Docking Initialization
    void SetInitialDockLayout();

private:
    // Editor State
    bool m_DockspaceInitialized = false;
    EditorPage m_CurrentPage = EditorPage::Physics;
    std::string m_StatusText = "Ready. Welcome to the Nova Editor.";
};