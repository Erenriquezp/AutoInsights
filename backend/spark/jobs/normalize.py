"""Model-name normalization. Pure Python, no Spark: runs inside a UDF on the workers."""

import re

# Model catalog per brand. A listing whose model text contains one of these names is mapped to it.
# fmt: off
KNOWN_MODELS: dict[str, list[str]] = {
    "ford": [
        "f-150", "f150", "mustang", "explorer", "escape", "focus", "fusion",
        "ranger", "edge", "expedition", "taurus", "fiesta", "flex", "bronco",
        "f-250", "f250", "f-350", "f-450", "f-550", "transit", "econoline", "excursion",
        "e-150", "e-250", "e-350", "e-450"
    ],
    "chevrolet": [
        "silverado", "malibu", "equinox", "cruze", "impala", "tahoe", "suburban",
        "corvette", "camaro", "colorado", "traverse", "blazer", "trax", "aveo",
        "spark", "sonic", "bolt", "volt", "avalanche", "express"
    ],
    "toyota": [
        "camry", "corolla", "rav4", "tacoma", "tundra", "4runner", "highlander",
        "sienna", "prius", "avalon", "yaris", "sequoia", "venza", "c-hr", "supra",
        "land cruiser", "matrix", "celica", "echo", "fj cruiser"
    ],
    "honda": [
        "civic", "accord", "cr-v", "pilot", "odyssey", "fit", "hr-v", "ridgeline",
        "insight", "passport", "element", "crosstour", "prelude", "s2000"
    ],
    "nissan": [
        "altima", "sentra", "rogue", "maxima", "pathfinder", "murano", "verso",
        "frontier", "titan", "armada", "leaf", "juk", "kicks", "nv200", "quest",
        "350z", "370z", "gt-r"
    ],
    "jeep": [
        "wrangler", "grand cherokee", "cherokee", "compass", "renegade", "liberty",
        "patriot", "gladiator", "commander", "wagoneer"
    ],
    "ram": ["1500", "2500", "3500", "promaster", "dakota"],
    "gmc": ["sierra", "acadia", "terrain", "yukon", "canyon", "envoy", "savana"],
    "subaru": ["outback", "forester", "impreza", "legacy", "crosstrek", "wrx", "brz", "ascent"],
    "dodge": [
        "charger", "challenger", "durango", "journey", "grand caravan", "dart", "avenger", "ram"
    ],
    "bmw": [
        "3 series", "5 series", "x3", "x5", "328i", "335i", "528i", "535i", "m3", "m5", "x1",
        "7 series"
    ],
    "mercedes-benz": ["c-class", "e-class", "s-class", "glc", "gle", "cla", "g-class", "sprinter"],
    "hyundai": [
        "elantra", "sonata", "tucson", "santa fe", "accent", "veloster", "kona", "palisade"
    ],
    "kia": ["optima", "sorento", "soul", "sportage", "forte", "rio", "stinger", "telluride"],
    "volkswagen": ["jetta", "passat", "tiguan", "golf", "beetle", "atlas", "cc"],
    "audi": ["a4", "a6", "q5", "q7", "a3", "a5", "q3", "tt"],
    "mazda": [
        "cx-30", "cx-3", "cx-5", "cx-7", "cx-9", "mx-5", "mazda2", "mazda3", "mazda5", "mazda6",
        "tribute", "protege", "rx-8"
    ],
}
# fmt: on

# Spelling fixes applied before the catalog lookup
DIRECT_MAPPINGS: dict[str, str] = {
    "4 runner": "4runner",
    "4- runner": "4runner",
    "4-runner": "4runner",
    "pkup": "pickup",
    "p/u": "pickup",
}

# Spelling variants matched on word boundaries (safer than substrings): one model, one name
REGEX_MAPPINGS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\brav\s?4\b"), "rav4"),
    (re.compile(r"\bland\s?cruiser\b"), "land cruiser"),
    (re.compile(r"\bcrv\b"), "cr-v"),
    (re.compile(r"\bhrv\b"), "hr-v"),
    (re.compile(r"\b(\d)[\s-]?series\b"), r"\1 series"),
    (re.compile(r"\bc[\s-]?max\b"), "c-max"),
    (re.compile(r"\bcx[\s-]?(\d{1,2})\b"), r"cx-\1"),
    (re.compile(r"\bmx[\s-]?5\b"), "mx-5"),
    (re.compile(r"\bmazda\s(\d)\b"), r"mazda\1"),
]

# Brand-specific model numbers: Mazda's bare "3" is the Mazda3; Mercedes writes "c 300" for c300
BRAND_REGEX_MAPPINGS: dict[str, list[tuple[re.Pattern[str], str]]] = {
    "mazda": [(re.compile(r"^(?:mazda\s?)?([2356])\b"), r"mazda\1")],
    "mercedes-benz": [(re.compile(r"\b([a-z]{1,3})\s(\d{3})\b"), r"\1\2")],
}

# Other names sellers use for a brand, removed together with the brand in the fallback
BRAND_ALIASES: dict[str, list[str]] = {
    "mercedes-benz": ["mercedes-benz", "mercedes benz", "mercedes", "benz"],
    "volkswagen": ["volkswagen", "vw"],
    "chevrolet": ["chevrolet", "chevy"],
}

# Ford F-series written as "f150", "f 350", "f-450sd"... -> "f-150", "f-350", "f-450sd"
F_SERIES_PATTERN = re.compile(r"\bf[\s-]?([1-7]50)(?!\d)")
# Ford E-Series vans the same way; Ford only, since "e350" is also a Mercedes-Benz E-Class
E_SERIES_PATTERN = re.compile(r"\be[\s-]?([1-4]50)(?!\d)")
# A leading model year in the model text ("2014 mazda3") is not part of the model
LEADING_YEAR_PATTERN = re.compile(r"^(19|20)\d{2}\b\s*")

# Words that mark the end of the model name in a listing title (trim level, body, condition...)
# fmt: off
JUNK_WORDS: list[str] = [
    "owner", "clean", "title", "rust", "free", "new", "lift", "tires", "wheels", "door",
    "4wd", "awd", "4x4", "auto", "manual", "cyl", "v6", "v8", "sedan", "suv", "coupe",
    "convertible", "hatchback", "pickup", "truck", "van", "wagon", "edition", "sport",
    "limited", "lx", "ex", "se", "le", "xlt", "lariat",
    # drivetrain and trim names that follow the model
    "4matic", "xdrive", "quattro", "touring", "signature", "premium",
]
# fmt: on

# Cuts from the token that contains a noise word ("sh-awd", "4-door") to the end of the text
JUNK_PATTERN = re.compile(r"\S*\b(" + "|".join(JUNK_WORDS) + r")\b.*")
NON_ALPHANUMERIC_PATTERN = re.compile(r"[^a-z0-9\s-]")

# Catalog names per brand, longest first, so "grand cherokee" wins over "cherokee"
_CATALOG_BY_LENGTH: dict[str, list[str]] = {
    brand: sorted(models, key=len, reverse=True) for brand, models in KNOWN_MODELS.items()
}


def clean_model_name(manufacturer: str | None, raw_model: str | None) -> str:
    """Normalize a free-text model name.

    Returns a catalog model when one is found in the text, otherwise the first two tokens of
    the cleaned text, "other" when nothing is left, or "unknown" when there is no model text.
    """
    if not raw_model:
        return "unknown"

    brand = str(manufacturer).lower().strip() if manufacturer else ""
    text = LEADING_YEAR_PATTERN.sub("", str(raw_model).lower().strip())

    for wrong, right in DIRECT_MAPPINGS.items():
        if wrong in text:
            text = text.replace(wrong, right)
    for pattern, replacement in REGEX_MAPPINGS:
        text = pattern.sub(replacement, text)
    for pattern, replacement in BRAND_REGEX_MAPPINGS.get(brand, []):
        text = pattern.sub(replacement, text)
    text = F_SERIES_PATTERN.sub(r"f-\1", text)
    if brand == "ford":
        text = E_SERIES_PATTERN.sub(r"e-\1", text)

    for model in _CATALOG_BY_LENGTH.get(brand, []):
        if model in text:
            return model

    # "Super Duty" without a series number: assume the most common one
    if brand == "ford" and "super duty" in text:
        return "f-250"

    # Fallback: drop the brand as a whole word, cut at the first noise word, keep alphanumerics
    for name in BRAND_ALIASES.get(brand, [brand] if brand else []):
        text = re.sub(rf"\b{re.escape(name)}\b", "", text)
    text = JUNK_PATTERN.sub("", text.strip())
    text = NON_ALPHANUMERIC_PATTERN.sub("", text)

    tokens = [token.strip("-") for token in text.split()]
    tokens = [token for token in tokens if token]
    return " ".join(tokens[:2]) if tokens else "other"
