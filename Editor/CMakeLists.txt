#CMake configuration for Editor application
cmake_minimum_required(VERSION 3.20)
project(EditorApp LANGUAGES C CXX)

# create executable
add_executable(Editor 
    main.cpp
    EditorApplication.h
    EditorApplication.cpp
)

# include engine headers
target_include_directories(Editor PRIVATE
    ${CMAKE_SOURCE_DIR}/Engine
)

# link engine and glfw (imgui already in MyEngine)
target_link_libraries(Editor PRIVATE
    MyEngine
    glfw
)

# set C++ standard
set_target_properties(Editor PROPERTIES
    CXX_STANDARD 20
    CXX_STANDARD_REQUIRED ON
)