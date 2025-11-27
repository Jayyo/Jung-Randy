import bpy
import sys
import os

def convert_fbx_to_glb(input_path, output_path):
    # Clear existing scene
    bpy.ops.wm.read_factory_settings(use_empty=True)

    # Import FBX
    bpy.ops.import_scene.fbx(filepath=input_path)

    # Export as GLB
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        export_animations=True,
        export_skins=True
    )
    print(f"Converted: {input_path} -> {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: blender --background --python convert_fbx_to_glb.py -- input.fbx output.glb")
        sys.exit(1)

    # Get arguments after "--"
    argv = sys.argv[sys.argv.index("--") + 1:]
    input_path = argv[0]
    output_path = argv[1]

    convert_fbx_to_glb(input_path, output_path)
