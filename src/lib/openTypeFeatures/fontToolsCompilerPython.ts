export const FONTTOOLS_COMPILER_PYTHON = `
import copy
import traceback
from fontTools.ttLib import TTFont
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString


def kumiko_compile_fea(input_path, fea_path, output_path, preserve_source_path=None, preserve_tables=None):
    try:
        font = TTFont(input_path)
        if preserve_source_path:
            source_font = TTFont(preserve_source_path)
            for table_tag in preserve_tables or []:
                if table_tag in source_font:
                    font[table_tag] = copy.deepcopy(source_font[table_tag])

        with open(fea_path, "r", encoding="utf-8") as feature_file:
            feature_text = feature_file.read()

        addOpenTypeFeaturesFromString(font, feature_text)
        font.save(output_path)

        return {
            "ok": True,
            "message": "fontTools compiled OpenType features.",
            "rawCompilerOutput": "fontTools compiled OpenType features.",
        }
    except Exception as error:
        raw_output = traceback.format_exc()
        return {
            "ok": False,
            "message": str(error),
            "rawCompilerOutput": raw_output,
        }
`
