"""
retriever.py
Qdrant retrieval and score filtering utilities.
"""

from __future__ import annotations

import json
import os
import re
import warnings
from pathlib import Path
from typing import Any

from qdrant_client import QdrantClient

from config import settings

warnings.filterwarnings("ignore")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

_qdrant: QdrantClient | None = None
_model: Any | None = None
_local_index: list[dict[str, Any]] | None = None

LOCAL_PROCESSED_FILENAMES = [
    "193_gelir_vergisi_kanunu_chunks.json",
    "2004_icra_ve_iflas_kanunu_chunks.json",
    "2577_i\u0307dari_yarg\u0131lama_usul\u00fc_kanunu_chunks.json",
    "2709_t\u00fcrkiye_cumhuriyeti_anayasas\u0131_chunks.json",
    "2911_toplant\u0131_ve_g\u00f6steri_y\u00fcr\u00fcy\u00fc\u015fler_chunks.json",
    "2918_karayollar\u0131_trafik_kanunu_chunks.json",
    "2942_kamula\u015ft\u0131rma_kanunu_chunks.json",
    "3065_katma_de\u011fer_vergisi_kanunu_chunks.json",
    "3071_dilekçe_hakk\u0131n\u0131n_kullan\u0131lmas\u0131n_chunks.json",
    "3194_i\u0307mar_kanunu_chunks.json",
    "4447_i\u0307\u015fsizlik_sigortas\u0131_kanunu_chunks.json",
    "4721_t\u00fcrk_medeni_kanunu_chunks.json",
    "4734_kamu_i\u0307hale_kanunu_chunks.json",
    "4857_is_kanunu_chunks.json",
    "4904_t\u00fcrkiye_i\u0307\u015f_kurumu_kanunu_chunks.json",
    "4982_bilgi_edinme_hakk\u0131_kanunu_chunks.json",
    "5070_elektronik_i\u0307mza_kanunu_chunks.json",
    "5237_t\u00fcrk_ceza_kanunu_chunks.json",
    "5253_dernekler_kanunu_chunks.json",
    "5411_bankac\u0131l\u0131k_kanunu_chunks.json",
    "5510_sgk_kanunu_chunks.json",
    "5520_kurumlar_vergisi_kanunu_chunks.json",
    "5651_i\u0307nternet_ortam\u0131nda_yap\u0131lan_yay_chunks.json",
    "5846_fikir_ve_sanat_eserleri_kanunu_chunks.json",
    "6098_turk_borclar_kanunu_chunks.json",
    "6100_hukuk_muhakemeleri_kanunu_chunks.json",
    "6102_t\u00fcrk_ticaret_kanunu_chunks.json",
    "6284_ailenin_korunmas\u0131_ve_kad\u0131na_ka_chunks.json",
    "6306_afet_riski_alt\u0131ndaki_alanlar\u0131n_chunks.json",
    "6331_i\u0307\u015f_sa\u011fl\u0131\u011f\u0131_ve_g\u00fcvenli\u011fi_kanunu_chunks.json",
    "6356_sendikalar_ve_toplu_i\u0307\u015f_s\u00f6zle\u015fm_chunks.json",
    "6362_sermaye_piyasas\u0131_kanunu_chunks.json",
    "6502_t\u00fcketicinin_korunmas\u0131_hakk\u0131nda_chunks.json",
    "657_devlet_memurlar\u0131_kanunu_chunks.json",
    "6698_ki\u015fisel_verilerin_korunmas\u0131_ka_chunks.json",
    "7036_i\u0307\u015f_mahkemeleri_kanunu_chunks.json",
    "7201_tebligat_kanunu_chunks.json",
]

TOKEN_RE = re.compile(r"[0-9a-z_]+")
MADDE_RE = re.compile(r"(?:madde|md)\s*\.?\s*(\d+)")
LAW_NUMBERS = (
    "193", "2004", "2577", "2709", "2911", "2918", "2942",
    "3065", "3071", "3194", "4447", "4721", "4734", "4857",
    "4904", "4982", "5070", "5237", "5253", "5411", "5510",
    "5520", "5651", "5846", "6098", "6100", "6102", "6284",
    "6306", "6331", "6356", "6362", "6502", "657", "6698",
    "7036", "7201",
)

LAW_HINT_KEYWORDS = {
    "4857": {"isci", "isveren", "kidem", "ihbar", "mesai", "fesih", "ucret", "calisma",
             "izin", "bakim", "mazeret", "hasta", "hastalik", "dogum", "analik",
             "isten", "ise", "tazminat", "istifa", "maden", "cocuk", "yas", "engelli",
             "gece", "deniz", "is_sozlesmesi", "belirsiz", "calisabilir", "calisti",
             "haftalik", "gunluk", "yillik", "alt_sinir", "isciye"},
    "5510": {"sgk", "sigorta", "emeklilik", "prim", "borclanma", "is_kazasi", "kazasi",
             "bildirim", "malulluk", "analik", "istirahat", "rapor", "gecici",
             "odeme", "saglik", "emekli", "kisa_vade", "uzun_vade", "istirahati"},
    "6098": {"borclar", "kira", "depozito", "temerrut", "sozlesme", "alacak", "satis",
             "ayip", "faiz", "cezai", "kefalet", "hibe", "vekaletname", "dava",
             "haksiz", "tazminat", "zarar", "cayma", "fesih", "simsarlik"},
    "5237": {"suc", "ceza", "hapis", "adli", "kovusturma", "beraat", "mahkumiyet",
             "hirsizlik", "dolandiricilik", "hakaret", "tehdit", "darp", "yaralama",
             "cinayet", "sahtecilik", "zimmet", "irtikap", "rüsvet", "aldatma",
             "cinsel", "konut", "kisi", "ozgurlu"},
    "4721": {"medeni", "velayet", "bosanma", "nafaka", "evlilik", "nikah", "miras",
             "veraset", "aile", "cocuk", "vesayet", "kayyum", "mal_rejimi",
             "hisim", "evlat", "tanima", "soyadi", "mülkiyet", "tasinmaz"},
    "6502": {"tuketici", "ayipli", "garanti", "iade", "cayma", "mesafeli",
             "e_ticaret", "online", "kampanya", "haksiz_sart", "fatura",
             "teslim", "abonelik", "devre_mulk", "paket_tur"},
    "6102": {"ticaret", "sirket", "limited", "anonim", "ortaklik", "hisse",
             "konkordato", "iflas", "tasfiye", "ticaret_sicil", "senet",
             "cek", "kambiyo", "acente", "komisyoncu", "sigorta_sirket"},
    "657":  {"memur", "devlet_memur", "kamu_gorevli", "disiplin", "ihrac",
             "atama", "terfi", "ozluk", "izin", "mali_haklar", "sicil",
             "gorev", "unvan", "kadro"},
    "2577": {"idare", "idari_islem", "iptal_dava", "idare_mahkeme",
             "yurutmeyi_durdurma", "idari_yargi", "danistay", "tam_yargi"},
    "6698": {"kvkk", "kisisel_veri", "veri_sorumlusu", "acik_riza",
             "veri_isleme", "unutulma", "veri_ihlali", "kurul"},
    "2709": {"anayasa", "temel_haklar", "ozgurluk", "esitlik", "secim",
             "meclis", "cumhurbaskani", "yargı", "anayasa_mahkeme"},
    "193":  {"gelir_vergisi", "stopaj", "beyanname", "muhtasar", "sgk_prim",
             "vergi_dilimi", "istisna", "muafiyet", "kira_geliri"},
    "3065": {"kdv", "katma_deger", "vergi_iade", "ozel_matrah", "ihracat",
             "istisna", "indirim", "beyan"},
    "2004": {"icra", "haciz", "borçlu", "alacakli", "iflas", "tahliye",
             "itiraz", "icra_takibi", "odeme_emri", "dosyasi"},
    "6331": {"is_sagligi", "is_guvenligi", "ise_giris", "risk_degerlendirme",
             "kisisel_koruyucu", "osgb", "isg", "ramak_kala"},
    "4447": {"issizlik", "issizlik_sigortasi", "ise", "is_bul", "kıdem_tazminat"},
    "6356": {"sendika", "toplu_is_sozlesmesi", "grev", "lokavt", "isci_temsilci"},
    "2918": {"trafik", "ehliyet", "arac", "kaza", "sigorta", "plaka",
             "surucü", "trafikten_men"},
    "6100": {"hukuk_mahkeme", "dava_acma", "yargilama", "delil", "tanik",
             "bilirkisi", "temyiz", "istinaf"},
    "7036": {"is_mahkeme", "arabuluculuk", "is_davasi", "zorunlu_arabuluculuk"},
    "4734": {"ihale", "kamu_ihale", "teklif", "muteahhit", "sozlesme",
             "yasaklilik", "degerlendirme"},
    "5520": {"kurumlar_vergisi", "sirket_vergi", "beyanname", "kâr",
             "zarar", "örtulu_kazanc"},
    "5651": {"internet", "icerik_engel", "erisim_engel", "sosyal_medya",
             "bant_genisligi", "kaldirma"},
    "5846": {"telif", "fikir_eseri", "eser_sahibi", "koruma", "izin",
             "lisans", "intihal"},
    "6284": {"siddet", "uzaklastirma", "tedbir", "kadin", "aile_ici"},
    "6362": {"sermaye_piyasasi", "borsa", "hisse_senedi", "tahvil",
             "spk", "aracı_kurum"},
    "4982": {"bilgi_edinme", "basvuru", "kurum_bilgi", "red"},
    "2942": {"kamulaştırma", "istimlak", "bedel", "tasinmaz"},
    "3071": {"dilekce", "basvuru_hakki", "sikayet", "talep"},
    "5411": {"banka", "kredi", "faiz", "tüketici_kredisi", "mortgage",
             "teminat", "bddk"},
    "5253": {"dernek", "uyelik", "tüzel_kisi", "genel_kurul"},
    "4904": {"iskur", "is_bul", "mesleki_egitim"},
    "5070": {"elektronik_imza", "e_imza", "nitelikli"},
    "3194": {"imar", "insaat_ruhsat", "yapı", "imar_plani"},
    "6306": {"kentsel_donusum", "riskli_yapi", "afet"},
    "7201": {"tebligat", "bildirim", "adres", "iade"},
}

QUERY_SYNONYMS = {
    "stopaj": {"tevkifat", "tevkifati"},
    "tevkifat": {"stopaj"},
    "muhtasar": {"beyanname"},
    "beyanname": {"muhtasar"},
    "kidem": {"tazminat"},
    "ihtar": {"bildirim"},
}

TRANSLATION_TABLE = str.maketrans(
    {
        "ç": "c",
        "Ç": "c",
        "ğ": "g",
        "Ğ": "g",
        "ı": "i",
        "İ": "i",
        "ö": "o",
        "Ö": "o",
        "ş": "s",
        "Ş": "s",
        "ü": "u",
        "Ü": "u",
    }
)

MOCK_CHUNKS = [
    {
        "payload": {
            "kaynak_turu": "kanun",
            "kanun_adi": "4857 Sayili Is Kanunu",
            "madde_no": "Madde 17",
            "metin": (
                "Belirsiz sureli is sozlesmelerinin feshinde bildirim onellerine "
                "uyulmasi zorunludur. Is sozlesmeleri; iscinin kidemine gore "
                "belirli sureler oncesinde bildirimde bulunularak feshedilebilir."
            ),
            "chunk_id": "kanun_4857_m17",
        },
        "skor": 0.91,
    }
]


def _normalize(text: str) -> str:
    return (text or "").translate(TRANSLATION_TABLE).lower()


def _tokenize(text: str) -> list[str]:
    return TOKEN_RE.findall(_normalize(text))


def _processed_dir() -> Path:
    return Path(__file__).resolve().parents[1] / "data" / "processed"


def _iter_local_paths() -> list[Path]:
    base = _processed_dir()
    return [base / name for name in LOCAL_PROCESSED_FILENAMES if (base / name).exists()]


def _extract_law_id(text: str) -> str:
    for law_no in LAW_NUMBERS:
        if law_no in text:
            return law_no
    return ""


def _extract_madde_no(madde_text: str) -> str:
    nums = re.findall(r"\d+", _normalize(madde_text))
    return nums[0] if nums else ""


def _build_local_index() -> list[dict[str, Any]]:
    index: list[dict[str, Any]] = []

    for path in _iter_local_paths():
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue

        if not isinstance(raw, list):
            continue

        for item in raw:
            if not isinstance(item, dict):
                continue

            payload = {
                "chunk_id": item.get("chunk_id", ""),
                "kaynak_turu": item.get("kaynak_turu", "kanun"),
                "kanun_adi": item.get("kanun_adi", ""),
                "kanun_no": item.get("kanun_no", ""),
                "madde_no": item.get("madde_no", ""),
                "fikra_no": item.get("fikra_no"),
                "metin": item.get("metin", ""),
                "hukuk_alani": item.get("hukuk_alani", ""),
                "yil": item.get("yil"),
            }

            searchable = " ".join(
                [
                    str(payload.get("chunk_id", "")),
                    str(payload.get("kanun_adi", "")),
                    str(payload.get("madde_no", "")),
                    str(payload.get("metin", "")),
                    str(payload.get("hukuk_alani", "")),
                ]
            )
            normalized = _normalize(searchable)
            tokens = set(TOKEN_RE.findall(normalized))
            law_id = _extract_law_id(_normalize(payload.get("kanun_adi", "")))
            madde_no = _extract_madde_no(payload.get("madde_no", ""))

            index.append(
                {
                    "payload": payload,
                    "tokens": tokens,
                    "searchable": normalized,
                    "law_id": law_id,
                    "madde_no": madde_no,
                }
            )

    return index


def _get_local_index() -> list[dict[str, Any]]:
    global _local_index
    if _local_index is None:
        _local_index = _build_local_index()
    return _local_index


def has_local_corpus() -> bool:
    return len(_get_local_index()) > 0


def is_qdrant_configured() -> bool:
    return bool(settings.QDRANT_URL)


def _get_qdrant() -> QdrantClient:
    global _qdrant
    if _qdrant is None:
        if not is_qdrant_configured():
            raise RuntimeError("QDRANT_URL is not configured")
        _qdrant = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY)
    return _qdrant


def _get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer

        _model = SentenceTransformer(settings.EMBEDDING_MODEL)
    return _model


def _query_qdrant(embedding: list[float], top_n: int, kaynak_turu: str | None = None):
    client = _get_qdrant()
    qdrant_filter = None

    if kaynak_turu:
        from qdrant_client.models import FieldCondition, Filter, MatchValue

        qdrant_filter = Filter(
            must=[FieldCondition(key="kaynak_turu", match=MatchValue(value=kaynak_turu))]
        )

    if hasattr(client, "query_points"):
        return client.query_points(
            collection_name=settings.COLLECTION_NAME,
            query=embedding,
            limit=top_n,
            with_payload=True,
            query_filter=qdrant_filter,
        ).points

    return client.search(
        collection_name=settings.COLLECTION_NAME,
        query_vector=embedding,
        limit=top_n,
        with_payload=True,
        query_filter=qdrant_filter,
    )


def _extract_query_laws(query_norm: str) -> set[str]:
    return {law_no for law_no in LAW_NUMBERS if law_no in query_norm}


def _extract_query_madde_numbers(query_norm: str) -> set[str]:
    return set(MADDE_RE.findall(query_norm))


def _semantic_law_hints(query_tokens: set[str]) -> set[str]:
    hinted: set[str] = set()
    def _kw_match(token: str, keyword: str) -> bool:
        if token == keyword:
            return True
        if len(token) >= 4 and len(keyword) >= 4 and token.startswith(keyword[:4]):
            return True
        if len(token) >= 4 and len(keyword) >= 4 and keyword.startswith(token[:4]):
            return True
        return False

    for law_no, keywords in LAW_HINT_KEYWORDS.items():
        if any(_kw_match(token, kw) for token in query_tokens for kw in keywords):
            hinted.add(law_no)
    return hinted


def _expand_query_tokens(query_tokens: list[str]) -> list[str]:
    expanded = list(query_tokens)
    seen = set(expanded)
    for token in query_tokens:
        for synonym in QUERY_SYNONYMS.get(token, set()):
            if synonym not in seen:
                expanded.append(synonym)
                seen.add(synonym)
    return expanded


def _score_local_entry(
    entry: dict[str, Any],
    query_norm: str,
    query_tokens: list[str],
    query_laws: set[str],
    query_madde_numbers: set[str],
    hinted_laws: set[str],
) -> float:
    if not query_tokens:
        return 0.0

    token_set = entry["tokens"]
    searchable = entry["searchable"]

    def _token_present(token: str) -> bool:
        if token in token_set:
            return True
        if len(token) >= 5 and token[:5] in searchable:
            return True
        return False

    overlap = sum(1 for token in query_tokens if _token_present(token))
    score = overlap / len(query_tokens)

    if query_norm and query_norm in searchable:
        score += 0.3

    law_id = entry.get("law_id", "")
    if query_laws:
        if law_id in query_laws:
            score += 1.2
        elif law_id:
            score -= 0.8
    elif hinted_laws:
        if law_id in hinted_laws:
            score += 0.9
        elif law_id:
            score -= 0.35

    madde_no = entry.get("madde_no", "")
    if query_madde_numbers:
        if madde_no and madde_no in query_madde_numbers:
            score += 1.0
        elif query_laws and law_id in query_laws:
            score -= 0.4

    madde_label = _normalize(str(entry["payload"].get("madde_no", "")))
    query_token_set = set(query_tokens)
    if "gecici madde" in madde_label and "gecici" not in query_token_set:
        score -= 0.45
    if "ek madde" in madde_label and "ek" not in query_token_set:
        score -= 0.35
    if "mukerrer madde" in madde_label and "mukerrer" not in query_token_set:
        score -= 0.35

    return score


def _retrieve_local(query: str, top_n: int = 5, kaynak_turu: str | None = None) -> list[dict]:
    index = _get_local_index()
    if not index:
        return []

    query_norm = _normalize(query)
    query_tokens = [t for t in TOKEN_RE.findall(query_norm) if len(t) > 2]
    query_tokens = _expand_query_tokens(query_tokens)
    query_laws = _extract_query_laws(query_norm)
    query_madde_numbers = _extract_query_madde_numbers(query_norm)
    hinted_laws = _semantic_law_hints(set(query_tokens))

    scored: list[dict] = []
    for entry in index:
        payload = entry["payload"]
        if kaynak_turu and payload.get("kaynak_turu") != kaynak_turu:
            continue

        score = _score_local_entry(
            entry=entry,
            query_norm=query_norm,
            query_tokens=query_tokens,
            query_laws=query_laws,
            query_madde_numbers=query_madde_numbers,
            hinted_laws=hinted_laws,
        )

        if score > 0:
            scored.append({"payload": payload, "skor": round(score, 4)})

    if not scored:
        fallback_entries = index
        if query_laws:
            fallback_entries = [e for e in index if e.get("law_id") in query_laws] or index

        for entry in fallback_entries:
            payload = entry["payload"]
            if kaynak_turu and payload.get("kaynak_turu") != kaynak_turu:
                continue
            scored.append({"payload": payload, "skor": 0.01})
            if len(scored) >= top_n:
                break

    scored.sort(key=lambda x: x["skor"], reverse=True)
    return scored[:top_n]


def _should_merge_local_law_results(query: str, kaynak_turu: str | None = None) -> bool:
    if kaynak_turu == "kanun":
        return True

    query_norm = _normalize(query)
    query_tokens = {t for t in TOKEN_RE.findall(query_norm) if len(t) > 2}

    if _extract_query_laws(query_norm) or _extract_query_madde_numbers(query_norm):
        return True

    hinted_laws = _semantic_law_hints(query_tokens)
    if not hinted_laws:
        return False

    reference_prefixes = ("kanun", "madde", "madd", "sayil", "uyar")
    return any(
        token.startswith(prefix)
        for token in query_tokens
        for prefix in reference_prefixes
    )


def _merge_scored_chunks(
    primary: list[dict],
    secondary: list[dict],
    secondary_boost: float = 0.9,
) -> list[dict]:
    if not primary:
        return secondary
    if not secondary:
        return primary

    primary_max = max((c.get("skor", 0.0) for c in primary), default=0.0)
    secondary_max = max((c.get("skor", 0.0) for c in secondary), default=0.0)

    scaled_secondary: list[dict] = []
    if secondary_max > 0:
        target_max = primary_max if primary_max > 0 else 1.0
        scale = (target_max / secondary_max) * secondary_boost
        for chunk in secondary:
            scaled_secondary.append(
                {
                    "payload": chunk["payload"],
                    "skor": round(chunk.get("skor", 0.0) * scale, 4),
                }
            )
    else:
        scaled_secondary = secondary

    merged = sorted(primary + scaled_secondary, key=lambda c: c.get("skor", 0.0), reverse=True)
    return _deduplicate_chunks(merged)


def _deduplicate_chunks(chunks: list[dict]) -> list[dict]:
    """Remove duplicate chunks by chunk_id or (karar_no+daire) for Yargitay decisions."""
    seen: set[str] = set()
    unique: list[dict] = []
    for c in chunks:
        p = c["payload"]
        kaynak_turu = p.get("kaynak_turu", "")
        if kaynak_turu == "yargitay_karari":
            key = f"{p.get('daire', '')}|{p.get('karar_no', '')}"
        else:
            key = p.get("chunk_id", "") or f"{p.get('kanun_adi', '')}|{p.get('madde_no', '')}"
        if key and key not in seen:
            seen.add(key)
            unique.append(c)
    return unique


def retrieve_chunks(query: str, top_n: int = 5, kaynak_turu: str | None = None) -> list[dict]:
    if settings.MOCK_RETRIEVAL:
        if not kaynak_turu:
            return MOCK_CHUNKS
        return [c for c in MOCK_CHUNKS if c["payload"].get("kaynak_turu") == kaynak_turu]

    if not is_qdrant_configured():
        return _retrieve_local(query=query, top_n=top_n, kaynak_turu=kaynak_turu)

    # Qdrant for semantic search + local corpus for kanun maddeleri
    try:
        model = _get_model()
        embedding = model.encode(f"query: {query}").tolist()
        qdrant_results = _query_qdrant(
            embedding=embedding,
            top_n=top_n * 2,
            kaynak_turu=kaynak_turu,
        )
        raw = [{"payload": r.payload, "skor": r.score} for r in qdrant_results]
        deduped = _deduplicate_chunks(raw)

        should_merge_local_laws = _should_merge_local_law_results(query, kaynak_turu=kaynak_turu)

        if not deduped and not should_merge_local_laws:
            return _retrieve_local(query=query, top_n=top_n, kaynak_turu=kaynak_turu)

        if should_merge_local_laws or kaynak_turu is None:
            local_kanun = _retrieve_local(query=query, top_n=top_n * 2, kaynak_turu="kanun")
            if local_kanun:
                if kaynak_turu == "kanun":
                    boost = 0.85 if _extract_query_madde_numbers(_normalize(query)) else 0.95
                    deduped = _merge_scored_chunks(local_kanun, deduped, secondary_boost=boost)
                elif should_merge_local_laws:
                    deduped = _merge_scored_chunks(local_kanun, deduped, secondary_boost=0.92)
                else:
                    has_kanun = any(c["payload"].get("kaynak_turu") == "kanun" for c in deduped)
                    if not has_kanun:
                        deduped = _merge_scored_chunks(deduped, local_kanun, secondary_boost=0.9)

        return deduped[:top_n]
    except Exception:
        # Qdrant unavailable — fall back to local keyword index
        return _retrieve_local(query=query, top_n=top_n, kaynak_turu=kaynak_turu)


def filter_by_score(chunks: list[dict], threshold: float | None = None) -> list[dict]:
    if not chunks:
        return []

    if threshold is None:
        threshold = settings.SCORE_THRESHOLD

    filtered = [c for c in chunks if c["skor"] >= threshold]
    if filtered:
        return filtered

    sorted_chunks = sorted(chunks, key=lambda c: c["skor"], reverse=True)
    return sorted_chunks[: min(5, len(sorted_chunks))]
