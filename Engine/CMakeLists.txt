cmake_minimum_required(VERSION 3.20)
project(MyEngine LANGUAGES C CXX)

# Core engine sources
set(ENGINE_SRC
    Core/Application.cpp
    Core/Window.cpp
    Graphics/Renderer.cpp
    External/glad/src/glad.c
)

# Add imgui sources into engine so Editor does NOT need to link imgui.lib
# imgui source dir comes from FetchContent in root CMakeLists.txt
list(APPEND ENGINE_SRC
    ${imgui_SOURCE_DIR}/imgui.cpp
    ${imgui_SOURCE_DIR}/imgui_draw.cpp
    ${imgui_SOURCE_DIR}/imgui_tables.cpp
    ${imgui_SOURCE_DIR}/imgui_widgets.cpp
    ${imgui_SOURCE_DIR}/backends/imgui_impl_glfw.cpp
    ${imgui_SOURCE_DIR}/backends/imgui_impl_opengl3.cpp
)

add_library(MyEngine STATIC ${ENGINE_SRC})

target_include_directories(MyEngine PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/Core
    ${CMAKE_CURRENT_SOURCE_DIR}/Graphics
    ${CMAKE_CURRENT_SOURCE_DIR}/Input
    ${CMAKE_CURRENT_SOURCE_DIR}/External/glad/include
    ${imgui_SOURCE_DIR}
    ${imgui_SOURCE_DIR}/backends
)

# Link dependencies required by engine (glfw and opengl)
target_link_libraries(MyEngine PUBLIC
    glfw
    opengl32
)

# Ensure C++ standard
set_target_properties(MyEngine PROPERTIES
    CXX_STANDARD 20
    CXX_STANDARD_REQUIRED ON
)
