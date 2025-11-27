set(ENGINE_SRC
    Core/Application.cpp
    External/glad/src/glad.c
)

add_library(Engine STATIC ${ENGINE_SRC})

target_include_directories(Engine PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/External/glad/include
)

target_link_libraries(Engine PUBLIC glfw)
