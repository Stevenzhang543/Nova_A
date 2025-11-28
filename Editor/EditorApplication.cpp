#include "EditorApplication.h"
#include <imgui.h>
#include <imgui_internal.h>
#include <iostream>

EditorApplication::EditorApplication(const std::string& title, int width, int height)
    : Nova::Application(title, width, height)
{
	// --- BEGIN: Font and Style Configuration ---
	ImGuiIO& io = ImGui::GetIO();// Retrieve ImGui IO object

	ImFontConfig font_cfg; // Font configuration
	io.Fonts->AddFontDefault(&font_cfg);// Load default font with custom config
    io.FontGlobalScale = 22.0f / 13.0f; // Default ImGui font size is ~13.0f, scale up to 22.0f

    // Increase rounding for a "smoother" aesthetic on elements like buttons and sliders.
    ImGuiStyle& style = ImGui::GetStyle();
    style.FrameRounding = 5.0f;
    style.GrabRounding = 5.0f;
    // --- END: Font and Style Configuration ---

    // ps: avoid loading external fonts here due to previous runtime errors (file not found).
}

EditorApplication::~EditorApplication()
{
    // Cleanup editor-specific things here
}

// NEW FUNCTION: Sets up the fixed docking layout (called only once)
void EditorApplication::SetInitialDockLayout()
{
    // Get the ID of the main dockspace set up in Application.cpp
    ImGuiID dockspace_id = ImGui::GetID("NovaDockspace");

    // Destroy any existing layout before defining a new one
    ImGui::DockBuilderRemoveNode(dockspace_id);
    ImGui::DockBuilderAddNode(dockspace_id, ImGuiDockNodeFlags_DockSpace);
    ImGui::DockBuilderSetNodeSize(dockspace_id, ImGui::GetMainViewport()->Size);

    // Split the central node to create the sidebar on the left
    ImGuiID dock_main_id = dockspace_id;
    ImGuiID dock_left_id;

    // Split the main dockspace to create a left panel (Sidebar) with 15% width
    // The remaining space stays in dock_main_id for the Content panel
    ImGui::DockBuilderSplitNode(dock_main_id, ImGuiDir_Left, 0.10f, &dock_left_id, &dock_main_id);

    // Apply flags to prevent resizing/moving of the sidebar and content nodes
    ImGuiDockNode* left_node = ImGui::DockBuilderGetNode(dock_left_id);
    if (left_node) {
        // Lock the size and prevent resizing of the sidebar node
        left_node->LocalFlags |= ImGuiDockNodeFlags_NoResize | ImGuiDockNodeFlags_NoTabBar | ImGuiDockNodeFlags_NoCloseButton | ImGuiDockNodeFlags_NoDocking;
    }

    // Dock windows into the nodes
    ImGui::DockBuilderDockWindow("Sidebar", dock_left_id);
    ImGui::DockBuilderDockWindow("Content", dock_main_id);

    // Finish the docking setup
    ImGui::DockBuilderFinish(dockspace_id);

    m_DockspaceInitialized = true;
}

void EditorApplication::OnImGuiRender()
{
    // Set up the fixed layout on the first frame
    if (!m_DockspaceInitialized)
    {
        SetInitialDockLayout();
    }

    RenderMenuBar();
    RenderSidebar();
    RenderContentWindow();
    RenderStatusBar();
}

void EditorApplication::RenderMenuBar()
{
    // All text in this menu will use the globally set 22.0f font size.
    if (ImGui::BeginMainMenuBar())
    {
        if (ImGui::BeginMenu("File"))
        {
            if (ImGui::MenuItem("New Scene", "Ctrl+N"))
            {
                m_StatusText = "Action: New Scene";
                std::cout << m_StatusText << std::endl;
            }
            if (ImGui::MenuItem("Open Scene...", "Ctrl+O"))
            {
                m_StatusText = "Action: Open Scene";
                std::cout << m_StatusText << std::endl;
            }
            if (ImGui::MenuItem("Save", "Ctrl+S"))
            {
                m_StatusText = "Action: Save";
                std::cout << m_StatusText << std::endl;
            }
            if (ImGui::MenuItem("Save As...", "Ctrl+Shift+S"))
            {
                m_StatusText = "Action: Save As";
                std::cout << m_StatusText << std::endl;
            }
            ImGui::Separator();
            if (ImGui::MenuItem("Exit"))
            {
                m_StatusText = "Action: Exit";
                std::cout << m_StatusText << std::endl;
            }
            ImGui::EndMenu();
        }
        if (ImGui::BeginMenu("Edit"))
        {
            if (ImGui::MenuItem("Undo", "Ctrl+Z"))
            {
                m_StatusText = "Action: Undo";
                std::cout << m_StatusText << std::endl;
            }
            if (ImGui::MenuItem("Redo", "Ctrl+Y"))
            {
                m_StatusText = "Action: Redo";
                std::cout << m_StatusText << std::endl;
            }
            ImGui::EndMenu();
        }
        if (ImGui::BeginMenu("View"))
        {
            if (ImGui::MenuItem("Show Physics Debug")) {}
            if (ImGui::MenuItem("Show Metrics")) {}
            ImGui::EndMenu();
        }

        ImGui::EndMainMenuBar();
    }
}

void EditorApplication::RenderSidebar()
{
    // Use flags to make the sidebar completely non-interactive and fixed.
    ImGuiWindowFlags window_flags =
        ImGuiWindowFlags_NoTitleBar |
        ImGuiWindowFlags_NoCollapse |
        ImGuiWindowFlags_NoMove |
        ImGuiWindowFlags_NoResize |
        ImGuiWindowFlags_NoBringToFrontOnFocus;

    // Push style to remove internal window padding, matching the VS Code feel
    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(0.0f, 0.0f));

    // Set the background color for the sidebar to be distinctly darker (VS Code sidebar color)
    ImGui::PushStyleColor(ImGuiCol_WindowBg, IM_COL32(20, 20, 20, 255));

    if (ImGui::Begin("Sidebar", nullptr, window_flags))
    {
        // Add some padding and spacing for the buttons
        // Increased padding and height to accommodate the larger font size
        ImGui::PushStyleVar(ImGuiStyleVar_FramePadding, ImVec2(10.0f, 10.0f));
        ImGui::PushStyleVar(ImGuiStyleVar_ItemSpacing, ImVec2(0.0f, 1.0f));

        // Style the buttons to look more like tabs/selection

        // Physics Button Color
        ImGui::PushStyleColor(ImGuiCol_Button, (m_CurrentPage == EditorPage::Physics) ? IM_COL32(0, 120, 212, 255) : IM_COL32(20, 20, 20, 255)); // Blue if active, same as window if inactive
        ImGui::PushStyleColor(ImGuiCol_ButtonHovered, IM_COL32(50, 50, 50, 255));
        ImGui::PushStyleColor(ImGuiCol_ButtonActive, IM_COL32(0, 120, 212, 255));

        // Physics Button
        if (ImGui::Button("PHYSICS", ImVec2(ImGui::GetContentRegionAvail().x, 60))) // Increased button height
        {
            m_CurrentPage = EditorPage::Physics;
            m_StatusText = "Switched to Physics Editor";
        }

        // Renderer Button Color
        ImGui::PopStyleColor(3);
        ImGui::PushStyleColor(ImGuiCol_Button, (m_CurrentPage == EditorPage::Renderer) ? IM_COL32(0, 120, 212, 255) : IM_COL32(20, 20, 20, 255));
        ImGui::PushStyleColor(ImGuiCol_ButtonHovered, IM_COL32(50, 50, 50, 255));
        ImGui::PushStyleColor(ImGuiCol_ButtonActive, IM_COL32(0, 120, 212, 255));

        // Renderer Button
        if (ImGui::Button("RENDERER", ImVec2(ImGui::GetContentRegionAvail().x, 60))) // Increased button height
        {
            m_CurrentPage = EditorPage::Renderer;
            m_StatusText = "Switched to Renderer Editor";
        }

        ImGui::PopStyleColor(3); // Pop the renderer button colors
        ImGui::PopStyleVar(2); // Pop FramePadding and ItemSpacing
    }
    ImGui::End();
    ImGui::PopStyleColor(); // Pop WindowBg color
    ImGui::PopStyleVar(); // Pop WindowPadding
}

void EditorApplication::RenderContentWindow()
{
    // Main content window acts as the editor background
    ImGuiWindowFlags window_flags =
        ImGuiWindowFlags_NoTitleBar |
        ImGuiWindowFlags_NoCollapse |
        ImGuiWindowFlags_NoMove |
        ImGuiWindowFlags_NoResize |
        ImGuiWindowFlags_NoBringToFrontOnFocus;

    // Push style to remove internal window padding for a full canvas look
    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(0.0f, 0.0f));
    ImGui::PushStyleColor(ImGuiCol_WindowBg, IM_COL32(35, 35, 35, 255)); // Set a distinct background color for the content

    if (ImGui::Begin("Content", nullptr, window_flags))
    {
        // Begin a child window to hold the actual content (necessary for proper graph drawing)
        ImGui::BeginChild("ContentArea", ImGui::GetContentRegionAvail());

        switch (m_CurrentPage)
        {
        case EditorPage::Physics:
            RenderPhysicsEditor();
            break;
        case EditorPage::Renderer:
            RenderRendererEditor();
            break;
        }

        ImGui::EndChild();
    }
    ImGui::End();
    ImGui::PopStyleColor(); // Pop WindowBg color
    ImGui::PopStyleVar(); // Pop WindowPadding
}

void EditorApplication::RenderStatusBar()
{
    // Reusing the fixed status bar logic
    ImGuiWindowFlags window_flags = ImGuiWindowFlags_NoScrollbar | ImGuiWindowFlags_NoSavedSettings | ImGuiWindowFlags_NoTitleBar | ImGuiWindowFlags_NoResize | ImGuiWindowFlags_NoMove;

    float height = ImGui::GetFrameHeight() + ImGui::GetStyle().WindowPadding.y * 2.0f;

    const ImGuiViewport* viewport = ImGui::GetMainViewport();

    ImVec2 pos = ImVec2(viewport->Pos.x, viewport->Pos.y + viewport->Size.y - height);
    ImGui::SetNextWindowPos(pos);
    ImGui::SetNextWindowSize(ImVec2(viewport->Size.x, height));
    ImGui::SetNextWindowViewport(viewport->ID);

    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(5.0f, 4.0f));
    ImGui::PushStyleVar(ImGuiStyleVar_WindowBorderSize, 0.0f);
    ImGui::PushStyleColor(ImGuiCol_WindowBg, IM_COL32(15, 15, 15, 255)); // Darkest color for status bar

    if (ImGui::Begin("##StatusBar", nullptr, window_flags))
    {
        ImGui::Text(m_StatusText.c_str());
    }
    ImGui::End();

    ImGui::PopStyleColor(); // Pop WindowBg color
    ImGui::PopStyleVar(2);
}


void EditorApplication::RenderPhysicsEditor()
{
    // Draw X-Y Coordinate Graph

    ImDrawList* drawList = ImGui::GetWindowDrawList();
    ImVec2 canvas_p0 = ImGui::GetCursorScreenPos(); // Top-left of the drawable area
    ImVec2 canvas_sz = ImGui::GetContentRegionAvail(); // Size of the drawable area
    if (canvas_sz.x < 50.0f) canvas_sz.x = 50.0f;
    if (canvas_sz.y < 50.0f) canvas_sz.y = 50.0f;
    ImVec2 canvas_p1 = ImVec2(canvas_p0.x + canvas_sz.x, canvas_p0.y + canvas_sz.y);
    ImVec2 origin = ImVec2(canvas_p0.x + canvas_sz.x * 0.5f, canvas_p0.y + canvas_sz.y * 0.5f);

    ImU32 gridColor = IM_COL32(200, 200, 200, 40);
    ImU32 axisColor = IM_COL32(255, 255, 255, 128);
    float gridStep = 50.0f;

    // Draw background
    drawList->AddRect(canvas_p0, canvas_p1, IM_COL32(255, 255, 255, 10)); // Subtle border

    // Draw grid lines
    for (float x = gridStep; x < canvas_sz.x * 0.5f; x += gridStep)
    {
        drawList->AddLine(ImVec2(origin.x + x, canvas_p0.y), ImVec2(origin.x + x, canvas_p1.y), gridColor);
        drawList->AddLine(ImVec2(origin.x - x, canvas_p0.y), ImVec2(origin.x - x, canvas_p1.y), gridColor);
    }
    for (float y = gridStep; y < canvas_sz.y * 0.5f; y += gridStep)
    {
        drawList->AddLine(ImVec2(canvas_p0.x, origin.y + y), ImVec2(canvas_p1.x, origin.y + y), gridColor);
        drawList->AddLine(ImVec2(canvas_p0.x, origin.y - y), ImVec2(canvas_p1.x, origin.y - y), gridColor);
    }

    // Draw X and Y axes
    drawList->AddLine(ImVec2(canvas_p0.x, origin.y), ImVec2(canvas_p1.x, origin.y), axisColor, 2.0f); // X-Axis
    drawList->AddLine(ImVec2(origin.x, canvas_p0.y), ImVec2(origin.x, canvas_p1.y), axisColor, 2.0f); // Y-Axis

    // Labels
    drawList->AddText(ImVec2(origin.x + 5, canvas_p0.y + 5), axisColor, "Y");
    drawList->AddText(ImVec2(canvas_p1.x - 15, origin.y + 5), axisColor, "X");
}

void EditorApplication::RenderRendererEditor()
{
    // Draw background for the renderer (blank)
    ImDrawList* drawList = ImGui::GetWindowDrawList();
    ImVec2 canvas_p0 = ImGui::GetCursorScreenPos();
    ImVec2 canvas_sz = ImGui::GetContentRegionAvail();

    // Center the text
    float textWidth = ImGui::CalcTextSize("Renderer Viewport (Blank)").x;
    ImGui::SetCursorPosX((canvas_sz.x - textWidth) * 0.5f);
    ImGui::SetCursorPosY(canvas_sz.y * 0.4f);

    ImGui::Text("Renderer Viewport (Blank)");
}