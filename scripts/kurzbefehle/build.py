#!/usr/bin/env python3
"""Build the reward-picture shortcuts from docs/kurzbefehle.md.

Usage: python3 scripts/kurzbefehle/build.py OUT_DIR

Reads the base prompt and the table between the build markers in docs/kurzbefehle.md and writes
one signed .shortcut file per row into OUT_DIR. Signing runs `shortcuts sign --mode anyone`, which
needs a Mac signed in to iCloud and sends a copy of each shortcut to Apple.
"""

import pathlib
import plistlib
import re
import subprocess
import sys
import uuid

DOC = pathlib.Path(__file__).resolve().parents[2] / "docs" / "kurzbefehle.md"
DATE_FORMAT = "yyyy-MM-dd HH-mm-ss"


def new_id():
    return str(uuid.uuid4()).upper()


def read_doc():
    text = DOC.read_text()
    base = re.search(r"<!-- build:base -->\s*`([^`]+)`", text).group(1)
    rows_block = re.search(r"<!-- build:rows -->\n(.*?)<!-- build:end -->", text, re.S).group(1)
    rows = []
    for line in rows_block.strip().splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) < 3 or cells[0] == "Name" or set(cells[0]) <= set("-: "):
            continue
        name, folder, prompt = cells[0], cells[1], cells[2].strip("`")
        rows.append((name, folder, f"{base}, {prompt}"))
    return rows


def destination_path(folder):
    prefix = f"Zahnputz-Fotos/{folder}/"
    position = len(prefix.encode("utf-16-le")) // 2
    return {
        "Value": {
            "string": prefix + "￼ " + folder + ".png",
            "attachmentsByRange": {
                f"{{{position}, 1}}": {
                    "Type": "CurrentDate",
                    "Aggrandizements": [
                        {
                            "Type": "WFDateFormatVariableAggrandizement",
                            "WFDateFormatStyle": "Custom",
                            "WFDateFormat": DATE_FORMAT,
                        }
                    ],
                }
            },
        },
        "WFSerializationType": "WFTextTokenString",
    }


def workflow(folder, prompt):
    repeat_group, image_id = new_id(), new_id()
    actions = [
        {
            "WFWorkflowActionIdentifier": "is.workflow.actions.repeat.each",
            "WFWorkflowActionParameters": {
                "GroupingIdentifier": repeat_group,
                "WFControlFlowMode": 0,
                "UUID": new_id(),
                "WFInput": {
                    "Value": {"Type": "ExtensionInput"},
                    "WFSerializationType": "WFTextTokenAttachment",
                },
            },
        },
        {
            "WFWorkflowActionIdentifier": "com.apple.GenerativePlaygroundApp.GenerateImageIntent",
            "WFWorkflowActionParameters": {
                "UUID": image_id,
                "prompt": prompt,
                "image": {
                    "Value": {"Type": "Variable", "VariableName": "Repeat Item"},
                    "WFSerializationType": "WFTextTokenAttachment",
                },
                "saveToLibrary": "never",
                "style": {
                    "identifier": "illustration",
                    "title": {"key": "Illustration"},
                    "subtitle": {"key": ""},
                },
                "AppIntentDescriptor": {
                    "AppIntentIdentifier": "GenerateImageIntent",
                    "BundleIdentifier": "com.apple.GenerativePlaygroundApp",
                    "Name": "Image Playground",
                    "TeamIdentifier": "0000000000",
                },
            },
        },
        {
            "WFWorkflowActionIdentifier": "is.workflow.actions.documentpicker.save",
            "WFWorkflowActionParameters": {
                "UUID": new_id(),
                "WFInput": {
                    "Value": {"Type": "ActionOutput", "OutputUUID": image_id, "OutputName": "Bild"},
                    "WFSerializationType": "WFTextTokenAttachment",
                },
                "WFAskWhereToSave": False,
                "WFSaveFileOverwrite": False,
                "WFFileDestinationPath": destination_path(folder),
            },
        },
        {
            "WFWorkflowActionIdentifier": "is.workflow.actions.repeat.each",
            "WFWorkflowActionParameters": {
                "GroupingIdentifier": repeat_group,
                "WFControlFlowMode": 2,
                "UUID": new_id(),
            },
        },
    ]
    return {
        "WFWorkflowClientVersion": "2607.0.2",
        "WFWorkflowMinimumClientVersion": 900,
        "WFWorkflowMinimumClientVersionString": "900",
        "WFWorkflowIcon": {"WFWorkflowIconGlyphNumber": 59511, "WFWorkflowIconStartColor": 4282601983},
        "WFWorkflowHasShortcutInputVariables": True,
        "WFWorkflowInputContentItemClasses": [
            "WFImageContentItem",
            "WFPhotoMediaContentItem",
            "WFGenericFileContentItem",
        ],
        "WFWorkflowTypes": ["ActionExtension", "QuickActions"],
        "WFQuickActionSurfaces": [],
        "WFWorkflowImportQuestions": [],
        "WFWorkflowActions": actions,
    }


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    out = pathlib.Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    for name, folder, prompt in read_doc():
        unsigned = out / f"{name}.wflow"
        signed = out / f"{name}.shortcut"
        with unsigned.open("wb") as file:
            plistlib.dump(workflow(folder, prompt), file, fmt=plistlib.FMT_BINARY)
        subprocess.run(
            ["shortcuts", "sign", "--mode", "anyone", "--input", str(unsigned), "--output", str(signed)],
            check=True,
        )
        unsigned.unlink()
        print(signed)


if __name__ == "__main__":
    main()
