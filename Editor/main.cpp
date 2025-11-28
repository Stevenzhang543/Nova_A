#include <iostream>
#include "EditorApplication.h"

int main()
{
    try {
        EditorApplication app("Nova_A Editor v0.0.2", 1600, 900);
        app.Run();
    }
    catch (const std::exception& ex) {
        std::cerr << "Fatal error: " << ex.what() << std::endl;
        return -1;
    }
    return 0;
}