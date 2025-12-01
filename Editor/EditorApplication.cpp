#include "EditorApplication.h"
#include <imgui.h>
#include <imgui_internal.h>
#include <iostream>

EditorApplication::EditorApplication(const std::string& title, int width, int height)
    : Nova::Application(title, width, height)
{
    ImGuiIO& io = ImGui::GetIO();

    ImFontConfig cfg;
    cfg.OversampleH = 8;
    cfg.OversampleV = 8;
    cfg.SizePixels = 22.0f;
    io.Fonts->AddFontDefault(&cfg);

    ImGui::GetStyle().FrameRounding = 5.0f;
    ImGui::GetStyle().GrabRounding = 5.0f;
}

EditorApplication::~EditorApplication() { }

void EditorApplication::SetInitialDockLayout()
{
    ImGuiID dockspace_id = ImGui::GetID("NovaDockspace");
    ImGui::DockBuilderRemoveNode(dockspace_id);
    ImGui::DockBuilderAddNode(dockspace_id, ImGuiDockNodeFlags_DockSpace);
    ImGui::DockBuilderSetNodeSize(dockspace_id, ImGui::GetMainViewport()->Size);

    ImGuiID dock_main_id = dockspace_id;
    ImGuiID dock_left_id;
    ImGui::DockBuilderSplitNode(dock_main_id, ImGuiDir_Left, 0.15f, &dock_left_id, &dock_main_id);

    if (ImGuiDockNode* left_node = ImGui::DockBuilderGetNode(dock_left_id))
        left_node->LocalFlags |= ImGuiDockNodeFlags_NoResize | ImGuiDockNodeFlags_NoTabBar | ImGuiDockNodeFlags_NoCloseButton | ImGuiDockNodeFlags_NoDocking;

    ImGui::DockBuilderDockWindow("Sidebar", dock_left_id);
    ImGui::DockBuilderDockWindow("Content", dock_main_id);
    ImGui::DockBuilderFinish(dockspace_id);

    m_DockspaceInitialized = true;
}

void EditorApplication::OnImGuiRender()
{
    if (!m_DockspaceInitialized) SetInitialDockLayout();

    RenderMenuBar();
    RenderSidebar();
    RenderContentWindow();
    RenderStatusBar();
}

void EditorApplication::RenderMenuBar()
{
    if (ImGui::BeginMainMenuBar())
    {
        if (ImGui::BeginMenu("文件 (File)"))
        {
            if (ImGui::MenuItem("新建场景 (New Scene)", "Ctrl+N")) m_StatusText = "Action: New Scene";
            if (ImGui::MenuItem("打开场景... (Open Scene...)", "Ctrl+O")) m_StatusText = "Action: Open Scene";
            if (ImGui::MenuItem("保存 (Save)", "Ctrl+S")) m_StatusText = "Action: Save";
            if (ImGui::MenuItem("另存为... (Save As...)", "Ctrl+Shift+S")) m_StatusText = "Action: Save As";
            ImGui::Separator();
            if (ImGui::MenuItem("退出 (Exit)")) m_StatusText = "Action: Exit";
            ImGui::EndMenu();
        }
        if (ImGui::BeginMenu("编辑 (Edit)"))
        {
            if (ImGui::MenuItem("撤销 (Undo)", "Ctrl+Z")) m_StatusText = "Action: Undo";
            if (ImGui::MenuItem("重做 (Redo)", "Ctrl+Y")) m_StatusText = "Action: Redo";
            ImGui::EndMenu();
        }
        ImGui::EndMainMenuBar();
    }
}

void EditorApplication::RenderSidebar()
{
    ImGuiWindowFlags window_flags =
        ImGuiWindowFlags_NoTitleBar | ImGuiWindowFlags_NoCollapse |
        ImGuiWindowFlags_NoMove | ImGuiWindowFlags_NoResize | ImGuiWindowFlags_NoBringToFrontOnFocus;

    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(0,0));
    ImGui::PushStyleColor(ImGuiCol_WindowBg, IM_COL32(20,20,20,255));

    if (ImGui::Begin("Sidebar", nullptr, window_flags))
    {
        ImGui::PushStyleVar(ImGuiStyleVar_FramePadding, ImVec2(10,10));
        ImGui::PushStyleVar(ImGuiStyleVar_ItemSpacing, ImVec2(0,1));

        auto drawBtn = [&](const char* label, EditorPage page){
            bool active = (m_CurrentPage == page);
            ImGui::PushStyleColor(ImGuiCol_Button, active ? IM_COL32(0,120,212,255) : IM_COL32(20,20,20,255));
            ImGui::PushStyleColor(ImGuiCol_ButtonHovered, IM_COL32(50,50,50,255));
            ImGui::PushStyleColor(ImGuiCol_ButtonActive, IM_COL32(0,120,212,255));
            if (ImGui::Button(label, ImVec2(ImGui::GetContentRegionAvail().x, 60)))
            {
                m_CurrentPage = page;
                m_StatusText = std::string("Switched to ") + label;
            }
            ImGui::PopStyleColor(3);
        };

        drawBtn("PHYSICS", EditorPage::Physics);
        drawBtn("RENDERER", EditorPage::Renderer);

        ImGui::PopStyleVar(2);
    }
    ImGui::End();
    ImGui::PopStyleColor();
    ImGui::PopStyleVar();
}

void EditorApplication::RenderContentWindow()
{
    ImGuiWindowFlags window_flags =
        ImGuiWindowFlags_NoTitleBar | ImGuiWindowFlags_NoCollapse | ImGuiWindowFlags_NoMove |
        ImGuiWindowFlags_NoResize | ImGuiWindowFlags_NoBringToFrontOnFocus;

    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(0,0));
    ImGui::PushStyleColor(ImGuiCol_WindowBg, IM_COL32(35,35,35,255));

    if (ImGui::Begin("Content", nullptr, window_flags))
    {
        ImGui::BeginChild("ContentArea", ImGui::GetContentRegionAvail());
        switch (m_CurrentPage)
        {
            case EditorPage::Physics: RenderPhysicsEditor(); break;
            case EditorPage::Renderer: RenderRendererEditor(); break;
        }
        ImGui::EndChild();
    }
    ImGui::End();

    ImGui::PopStyleColor();
    ImGui::PopStyleVar();
}

void EditorApplication::RenderStatusBar()
{
    ImGuiWindowFlags window_flags = ImGuiWindowFlags_NoScrollbar | ImGuiWindowFlags_NoSavedSettings |
                                    ImGuiWindowFlags_NoTitleBar | ImGuiWindowFlags_NoResize | ImGuiWindowFlags_NoMove;

    float height = ImGui::GetFrameHeight() + ImGui::GetStyle().WindowPadding.y * 2.0f;
    const ImGuiViewport* viewport = ImGui::GetMainViewport();
    ImVec2 pos = ImVec2(viewport->Pos.x, viewport->Pos.y + viewport->Size.y - height);
    ImGui::SetNextWindowPos(pos);
    ImGui::SetNextWindowSize(ImVec2(viewport->Size.x, height));
    ImGui::SetNextWindowViewport(viewport->ID);

    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(5.0f,4.0f));
    ImGui::PushStyleVar(ImGuiStyleVar_WindowBorderSize, 0.0f);
    ImGui::PushStyleColor(ImGuiCol_WindowBg, IM_COL32(15,15,15,255));

    if (ImGui::Begin("##StatusBar", nullptr, window_flags))
    {
        ImGui::Text("%s", m_StatusText.c_str());
    }
    ImGui::End();

    ImGui::PopStyleColor();
    ImGui::PopStyleVar(2);
}

void EditorApplication::RenderPhysicsEditor()
{
    ImDrawList* drawList = ImGui::GetWindowDrawList();
    ImVec2 canvas_p0 = ImGui::GetCursorScreenPos();
    ImVec2 canvas_sz = ImGui::GetContentRegionAvail();
    if (canvas_sz.x < 50.0f) canvas_sz.x = 50.0f;
    if (canvas_sz.y < 50.0f) canvas_sz.y = 50.0f;
    ImVec2 canvas_p1 = ImVec2(canvas_p0.x + canvas_sz.x, canvas_p0.y + canvas_sz.y);
    ImVec2 origin = ImVec2(canvas_p0.x + canvas_sz.x * 0.5f, canvas_p0.y + canvas_sz.y * 0.5f);

    ImU32 gridColor = IM_COL32(200,200,200,40);
    ImU32 axisColor = IM_COL32(255,255,255,128);
    float gridStep = 50.0f;

    drawList->AddRect(canvas_p0, canvas_p1, IM_COL32(255,255,255,10));

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

    drawList->AddLine(ImVec2(canvas_p0.x, origin.y), ImVec2(canvas_p1.x, origin.y), axisColor, 2.0f);
    drawList->AddLine(ImVec2(origin.x, canvas_p0.y), ImVec2(origin.x, canvas_p1.y), axisColor, 2.0f);

    drawList->AddText(ImVec2(origin.x + 5, canvas_p0.y + 5), axisColor, "Y");
    drawList->AddText(ImVec2(canvas_p1.x - 15, origin.y + 5), axisColor, "X");
}

void EditorApplication::RenderRendererEditor()
{
    ImVec2 canvas_sz = ImGui::GetContentRegionAvail();
    float textWidth = ImGui::CalcTextSize("Renderer Viewport (Blank)").x;
    ImGui::SetCursorPosX((canvas_sz.x - textWidth) * 0.5f);
    ImGui::SetCursorPosY(canvas_sz.y * 0.4f);
    ImGui::Text("Renderer Viewport (Blank)");
}
