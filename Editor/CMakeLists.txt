cmake_minimum_required(VERSION 3.20)
project(EditorApp LANGUAGES C CXX)

add_executable(Editor
    main.cpp
    EditorApplication.h
    EditorApplication.cpp
)

target_include_directories(Editor PRIVATE ${CMAKE_SOURCE_DIR}/Engine)

target_link_libraries(Editor PRIVATE MyEngine glfw)

set_target_properties(Editor PROPERTIES
    CXX_STANDARD 20
    CXX_STANDARD_REQUIRED ON
)
