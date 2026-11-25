"""Ilmiy foydalanish uchun ma'lumotlarni eksport qilish: CSV, JSON, TEI-EpiDoc (XML)."""
import csv
import io
import json
from xml.sax.saxutils import escape

from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone

LANG_ISO = {"arabic": "ar", "persian": "fa", "turkic": "chg", "other": "und"}

CSV_FIELDS = (
    "slug", "title_uz", "title_ru", "title_en", "monument", "monument_slug", "region", "city",
    "language", "script", "technique", "placement_uz", "original_text", "transliteration",
    "translation_uz", "translation_ru", "translation_en", "commentary_uz", "period_text",
    "year_from", "year_to", "hijri_date", "calligrapher", "latitude", "longitude", "sources", "url",
)


def row(ins):
    m = ins.monument
    return {
        "slug": ins.slug,
        "title_uz": ins.title_uz, "title_ru": ins.title_ru, "title_en": ins.title_en,
        "monument": m.name_uz, "monument_slug": m.slug,
        "region": m.region.name_uz if m.region_id else "", "city": m.city,
        "language": ins.language, "script": ins.script, "technique": ins.technique,
        "placement_uz": ins.placement_uz,
        "original_text": ins.original_text, "transliteration": ins.transliteration,
        "translation_uz": ins.translation_uz, "translation_ru": ins.translation_ru, "translation_en": ins.translation_en,
        "commentary_uz": ins.commentary_uz,
        "period_text": ins.period_text, "year_from": ins.year_from, "year_to": ins.year_to,
        "hijri_date": ins.hijri_date, "calligrapher": ins.calligrapher,
        "latitude": float(ins.lat) if ins.lat is not None else None,
        "longitude": float(ins.lng) if ins.lng is not None else None,
        "sources": " | ".join(
            s.citation + (f", {s.pages}" if s.pages else "") + (f" <{s.url}>" if s.url else "")
            for s in ins.sources.all()
        ),
        "url": ins.public_url("uz"),
    }


def _filename(ext):
    return f"bitiklar-{timezone.localdate().isoformat()}.{ext}"


def export_csv(qs):
    buf = io.StringIO()
    buf.write("﻿")  # Excel UTF-8 ni to'g'ri ochishi uchun BOM
    w = csv.DictWriter(buf, fieldnames=CSV_FIELDS)
    w.writeheader()
    for ins in qs:
        w.writerow(row(ins))
    resp = HttpResponse(buf.getvalue(), content_type="text/csv; charset=utf-8")
    resp["Content-Disposition"] = f'attachment; filename="{_filename("csv")}"'
    return resp


def export_json(qs):
    data = {
        "source": "BITIKLAR — bitiklar.uz",
        "license": "CC BY 4.0",
        "exported_at": timezone.now().isoformat(),
        "count": 0,
        "inscriptions": [],
    }
    for ins in qs:
        data["inscriptions"].append(row(ins))
    data["count"] = len(data["inscriptions"])
    resp = HttpResponse(json.dumps(data, ensure_ascii=False, indent=2), content_type="application/json; charset=utf-8")
    resp["Content-Disposition"] = f'attachment; filename="{_filename("json")}"'
    return resp


def _e(x):
    return escape(str(x or ""))


def tei_document(ins, standalone=True):
    """Bitta bitik uchun EpiDoc (TEI P5) hujjati."""
    m = ins.monument
    lang = LANG_ISO.get(ins.language, "und")
    date_attrs = ""
    if ins.year_from:
        date_attrs += f' notBefore="{int(ins.year_from):04d}"'
    if ins.year_to:
        date_attrs += f' notAfter="{int(ins.year_to):04d}"'
    sources = "\n".join(
        f'            <bibl type="{_e(s.kind)}">{_e(s.citation)}'
        + (f' <biblScope unit="page">{_e(s.pages)}</biblScope>' if s.pages else "")
        + (f' <ptr target="{_e(s.url)}"/>' if s.url else "")
        + "</bibl>"
        for s in ins.sources.all()
    )
    translations = "\n".join(
        f'      <div type="translation" xml:lang="{code}"><p>{_e(getattr(ins, f"translation_{code}"))}</p></div>'
        for code in ("uz", "ru", "en") if getattr(ins, f"translation_{code}")
    )
    commentary = "\n".join(
        f'      <div type="commentary" xml:lang="{code}"><p>{_e(getattr(ins, f"commentary_{code}"))}</p></div>'
        for code in ("uz", "ru", "en") if getattr(ins, f"commentary_{code}")
    )
    lat = ins.lat
    lng = ins.lng
    geo = f"<geo>{float(lat):.6f} {float(lng):.6f}</geo>" if lat is not None and lng is not None else ""
    decl = '<?xml version="1.0" encoding="UTF-8"?>\n' if standalone else ""
    return f"""{decl}<TEI xmlns="http://www.tei-c.org/ns/1.0" xml:id="bitiklar-{_e(ins.slug)}">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title xml:lang="uz">{_e(ins.title_uz)}</title>
        {f'<title xml:lang="ru">{_e(ins.title_ru)}</title>' if ins.title_ru else ''}
        {f'<title xml:lang="en">{_e(ins.title_en)}</title>' if ins.title_en else ''}
      </titleStmt>
      <publicationStmt>
        <authority>BITIKLAR</authority>
        <idno type="URI">{_e(ins.public_url("uz"))}</idno>
        <availability><licence target="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</licence></availability>
      </publicationStmt>
      <sourceDesc>
        <msDesc>
          <msIdentifier>
            <settlement>{_e(m.city)}</settlement>
            <repository>{_e(m.name_uz)}</repository>
            <idno>{_e(ins.slug)}</idno>
          </msIdentifier>
          <physDesc>
            <objectDesc><supportDesc><support>{_e(ins.get_technique_display())}</support></supportDesc>
              <layoutDesc><layout>{_e(ins.placement_uz)}</layout></layoutDesc></objectDesc>
            <handDesc><handNote script="{_e(ins.script)}">{_e(ins.get_script_display())}{f' — {_e(ins.calligrapher)}' if ins.calligrapher else ''}</handNote></handDesc>
          </physDesc>
          <history>
            <origin>
              <origDate{date_attrs}>{_e(ins.period_text)}{f' ({_e(ins.hijri_date)})' if ins.hijri_date else ''}</origDate>
              <origPlace><placeName>{_e(m.name_uz)}, {_e(m.city)}</placeName></origPlace>
            </origin>
          </history>
        </msDesc>
        <listPlace><place><placeName>{_e(m.name_uz)}</placeName><location>{geo}</location></place></listPlace>
      </sourceDesc>
    </fileDesc>
    <profileDesc><langUsage><language ident="{lang}">{_e(ins.get_language_display())}</language></langUsage></profileDesc>
  </teiHeader>
  <text>
    <body>
      <div type="edition" xml:lang="{lang}"><ab>{_e(ins.original_text)}</ab></div>
      {f'<div type="edition" subtype="transliteration" xml:lang="{lang}-Latn"><ab>{_e(ins.transliteration)}</ab></div>' if ins.transliteration else ''}
{translations}
{commentary}
      <div type="bibliography"><listBibl>
{sources}
      </listBibl></div>
    </body>
  </text>
</TEI>
"""


def tei_response(ins):
    resp = HttpResponse(tei_document(ins), content_type="application/tei+xml; charset=utf-8")
    resp["Content-Disposition"] = f'inline; filename="bitiklar-{ins.slug}.xml"'
    return resp


def export_tei(qs):
    docs = "\n".join(tei_document(ins, standalone=False) for ins in qs)
    body = f"""<?xml version="1.0" encoding="UTF-8"?>
<teiCorpus xmlns="http://www.tei-c.org/ns/1.0">
  <teiHeader>
    <fileDesc>
      <titleStmt><title>BITIKLAR — O'zbekiston epigrafikasi korpusi</title></titleStmt>
      <publicationStmt><authority>BITIKLAR</authority><date when="{timezone.localdate().isoformat()}"/>
        <idno type="URI">{_e(settings.FRONTEND_URL)}</idno></publicationStmt>
      <sourceDesc><p>bitiklar.uz ma'lumotlar bazasidan avtomatik eksport</p></sourceDesc>
    </fileDesc>
  </teiHeader>
{docs}
</teiCorpus>
"""
    resp = HttpResponse(body, content_type="application/tei+xml; charset=utf-8")
    resp["Content-Disposition"] = f'attachment; filename="{_filename("xml")}"'
    return resp
