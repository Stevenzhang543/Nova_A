// Editor/main.cpp
#include <iostream>
#include "Core/Application.h" // Includes Nova::Application

int main()
{
    try {
        // FIX: Must use the Nova namespace now
        Nova::Application app("Nova_A Editor v0.0.1.4", 1280, 720);
        app.Run();
    }
    catch (const std::exception& ex) {
        std::cerr << "Fatal error: " << ex.what() << std::endl;
        return -1;
    }
    return 0;
}