import io
import json
from pathlib import Path

import pymupdf
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
LIVRET = ROOT.parent
PDF = LIVRET / "dist" / "inerweb.fr-HabFluide-Tome1-Livret-eleve-7x10.pdf"
VISUELS = LIVRET / "visuels.gen"
TMP = LIVRET / "tmp" / "pdfs"
TMP.mkdir(parents=True, exist_ok=True)


def average_hash(image):
    grey = image.convert("L").resize((32, 32))
    pixels = list(grey.get_flattened_data())
    mean = sum(pixels) / len(pixels)
    return tuple(value > mean for value in pixels)


def distance(left, right):
    return sum(a != b for a, b in zip(left, right))


sources = {
    path.name: average_hash(Image.open(path))
    for path in sorted(VISUELS.glob("pack-*.png"))
}
document = pymupdf.open(PDF)
placements = []

for page_number, page in enumerate(document, start=1):
    for image_info in page.get_images(full=True):
        if tuple(image_info[2:4]) != (1200, 720):
            continue
        extracted = document.extract_image(image_info[0])["image"]
        candidate_hash = average_hash(Image.open(io.BytesIO(extracted)))
        name, score = min(
            ((name, distance(candidate_hash, source_hash)) for name, source_hash in sources.items()),
            key=lambda item: item[1],
        )
        if score == 0:
            placements.append({"page": page_number, "fichier": name})

unique = sorted({item["fichier"] for item in placements})
failures = []
if len(sources) != 18:
    failures.append(f"Le pack contient {len(sources)} PNG au lieu de 18.")
if unique != sorted(sources):
    failures.append("Toutes les planches du pack ne sont pas présentes dans le PDF.")
if document.page_count % 2:
    failures.append("Le PDF possède un nombre impair de pages.")
for page in document:
    if abs(page.rect.width - 432) > 0.1 or abs(page.rect.height - 648) > 0.1:
        failures.append("Au moins une page n'est pas au format 6 x 9 pouces.")
        break

pages = sorted({item["page"] for item in placements})
thumb_w, thumb_h, caption_h, columns = 288, 432, 34, 4
rows = (len(pages) + columns - 1) // columns
sheet = Image.new("RGB", (columns * thumb_w, rows * (thumb_h + caption_h)), "white")
draw = ImageDraw.Draw(sheet)
for index, page_number in enumerate(pages):
    page = document[page_number - 1]
    pixmap = page.get_pixmap(matrix=pymupdf.Matrix(1.5, 1.5), alpha=False)
    preview = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
    preview.thumbnail((thumb_w, thumb_h))
    x = (index % columns) * thumb_w
    y = (index // columns) * (thumb_h + caption_h)
    sheet.paste(preview, (x, y))
    names = [item["fichier"].removeprefix("pack-").removesuffix(".png") for item in placements if item["page"] == page_number]
    draw.text((x + 8, y + thumb_h + 8), f"p. {page_number} - {', '.join(names)}", fill="#1B3A63")

contact = TMP / "integration-pack-pages.png"
sheet.save(contact)
report = {
    "pdf": str(PDF),
    "pages": document.page_count,
    "format_points": [432, 648],
    "planches_uniques": len(unique),
    "emplacements": len(placements),
    "pages_concernees": pages,
    "placements": placements,
    "echecs": failures,
}
(TMP / "integration-pack-rapport.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

if failures:
    raise SystemExit("\n".join(failures))

print(f"PDF: {document.page_count} pages, format 6 x 9, pagination paire")
print(f"Pack: {len(unique)}/18 planches, {len(placements)} emplacements, {len(pages)} pages")
print(f"Aperçu: {contact}")
