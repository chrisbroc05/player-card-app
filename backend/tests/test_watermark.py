"""Unit tests for card image watermarking."""

from io import BytesIO

from PIL import Image

from utils.watermark import ONE_OF_ONE_TEXT, WATERMARK_TEXT, add_watermark, apply_edition_treatment


def _solid_card_bytes(width: int = 1024, height: int = 1024) -> bytes:
    img = Image.new("RGB", (width, height), (40, 80, 120))
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_add_watermark_returns_png_bytes():
    result = add_watermark(_solid_card_bytes())
    assert isinstance(result, bytes)
    assert result[:8] == b"\x89PNG\r\n\x1a\n"


def test_add_watermark_scales_font_with_card_width():
    small = add_watermark(_solid_card_bytes(512, 768))
    large = add_watermark(_solid_card_bytes(2048, 2048))
    assert len(large) > 0
    assert len(small) > 0


def test_add_watermark_preserves_dimensions():
    source = _solid_card_bytes(768, 1024)
    with Image.open(BytesIO(source)) as before:
        width, height = before.size
    with Image.open(BytesIO(add_watermark(source))) as after:
        assert after.size == (width, height)


def test_watermark_text_constant():
    assert "PROSPECT" in WATERMARK_TEXT
    assert "LEGENDS" in WATERMARK_TEXT


def test_apply_edition_treatment_omits_copy_number_text():
    treated = apply_edition_treatment(_solid_card_bytes(), edition_number=2, print_run=5)
    with Image.open(BytesIO(treated)) as img:
        assert img.size[0] > 512
        assert img.size[1] > 768


def test_apply_edition_treatment_adds_one_of_one_rarity_stamp_only_for_rarity():
    standard = apply_edition_treatment(_solid_card_bytes(), edition_number=1, print_run=1, rarity="standard")
    one_of_one = apply_edition_treatment(
        _solid_card_bytes(), edition_number=1, print_run=5, rarity="one_of_one"
    )
    assert len(one_of_one) != len(standard)
    assert ONE_OF_ONE_TEXT == "1 OF 1"
