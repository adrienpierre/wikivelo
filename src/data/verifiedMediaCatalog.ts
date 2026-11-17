import { MediaAttribution } from '../types/game';

export interface VerifiedCommonsMediaEntry {
  slug: string;
  thumbnailUrl: string;
  attribution: MediaAttribution;
}

export const EXTRA_WIKI_SLUGS: Record<string, string> = {
  "cx-albert": "Niels_Albert",
  "cx-alvarado": "Ceylin_del_Carmen_Alvarado",
  "cx-benidorm": "Cyclo-cross_de_Benidorm",
  "cx-brand": "Lucinda_Brand",
  "cx-cant": "Sanne_Cant",
  "cx-compton": "Katherine_Compton",
  "cx-dufraisse": "André_Dufraisse",
  "cx-gavere": "Cyclo-cross_de_Gavere",
  "cx-groenendaal": "Richard_Groenendaal",
  "cx-iserbyt": "Eli_Iserbyt",
  "cx-koppenberg": "Koppenbergcross",
  "cx-kupfernagel": "Hanka_Kupfernagel",
  "cx-liboton": "Roland_Liboton",
  "cx-loenhout": "Azencross",
  "cx-mondiaux": "Championnats_du_monde_de_cyclo-cross",
  "cx-namur-devers": "Cyclo-cross_de_Namur",
  "cx-nocturne-diegem": "Cyclo-cross_de_Diegem",
  "cx-nys": "Sven_Nys",
  "cx-robic": "Jean_Robic",
  "cx-ronhaar": "Pim_Ronhaar",
  "cx-stybar": "Zdeněk_Štybar",
  "cx-sweeck": "Laurens_Sweeck",
  "cx-thibau-nys": "Thibau_Nys",
  "cx-vananrooij": "Shirin_van_Anrooij",
  "cx-vanderhaar": "Lars_van_der_Haar",
  "cx-vanempel": "Fem_van_Empel",
  "cx-vanthourenhout": "Michael_Vanthourenhout",
  "cx-zonhoven-kuil": "Cyclo-cross_de_Zonhoven",
  "piste-andrews": "Ellesse_Andrews",
  "piste-aspi-derny": "Derny",
  "piste-bauge": "Grégory_Baugé",
  "piste-bthomas": "Benjamin_Thomas",
  "piste-casque-visiere": "Casque_de_vélo",
  "piste-copponi": "Clara_Copponi",
  "piste-course-points": "Course_aux_points",
  "piste-course-tempo": "Course_tempo",
  "piste-elimination": "Course_par_élimination",
  "piste-ganna": "Filippo_Ganna",
  "piste-gros": "Mathilde_Gros",
  "piste-hoy": "Chris_Hoy",
  "piste-keirin-epreuve": "Keirin",
  "piste-kenny": "Laura_Kenny",
  "piste-kilometre": "Kilomètre_(cyclisme)",
  "piste-lavreysen": "Harrie_Lavreysen",
  "piste-levier": "Vitesse_par_équipes",
  "piste-manchester": "Vélodrome_de_Manchester",
  "piste-meares": "Anna_Meares",
  "piste-morelon": "Daniel_Morelon",
  "piste-omnium-epreuve": "Omnium",
  "piste-pendleton": "Victoria_Pendleton",
  "piste-pervis": "François_Pervis",
  "piste-pignon-fixe": "Pignon_fixe",
  "piste-poursuite-eq": "Poursuite_par_équipes",
  "piste-poursuite-ind": "Poursuite_individuelle",
  "piste-recordheure": "Record_de_l'heure_cycliste",
  "piste-relais-madison": "Course_à_l'américaine_(cyclisme)",
  "piste-richardson": "Matthew_Richardson_(cyclisme)",
  "piste-rousseau": "Florian_Rousseau",
  "piste-scratch": "Course_scratch",
  "piste-sixjours": "Course_de_six_jours",
  "piste-sqy-national": "Vélodrome_national_de_Saint-Quentin-en-Yvelines",
  "piste-surplace": "Surplace",
  "piste-tandem-para": "Paracyclisme",
  "piste-tournant": "Arnaud_Tournant",
  "piste-veloroubaix": "Vélodrome_André-Pétrieux",
  "piste-vigier": "Sébastien_Vigier",
  "piste-vigorelli": "Vélodrome_Maspes-Vigorelli",
  "piste-virage-sqy": "Vélodrome_national_de_Saint-Quentin-en-Yvelines",
  "piste-viviani": "Elia_Viviani",
  "piste-vogel": "Kristina_Vogel",
  "piste-wiggins": "Bradley_Wiggins",
  "piste-wild": "Kirsten_Wild",
  "poly-cadence-sprint": "Sprint_(cyclisme)",
  "poly-capteur-watts": "Capteur_de_puissance_(cyclisme)",
  "poly-jeanjean": "Anthony_Jeanjean",
  "poly-kopecky": "Lotte_Kopecky",
  "poly-leaute": "Alexandre_Léauté",
  "poly-longo": "Jeannie_Longo",
  "poly-mohoric": "Matej_Mohorič",
  "poly-mvdp": "Mathieu_van_der_Poel",
  "poly-paris-brest": "Paris-Brest-Paris_randonneur",
  "poly-pfp": "Pauline_Ferrand-Prévot",
  "poly-pidcock": "Tom_Pidcock",
  "poly-pieterse": "Puck_Pieterse",
  "poly-pneu-gravel-42": "Gravel_(vélo)",
  "poly-sagan": "Peter_Sagan",
  "poly-storey": "Sarah_Storey",
  "poly-strade-bianche": "Strade_Bianche",
  "poly-vos": "Marianne_Vos",
  "poly-wva": "Wout_van_Aert",
  "route-alaphilippe": "Julian_Alaphilippe",
  "route-alpedhuez": "Alpe_d'Huez",
  "route-angliru": "Alto_de_l'Angliru",
  "route-anquetil": "Jacques_Anquetil",
  "route-arenberg": "Trouée_d'Arenberg",
  "route-bardet": "Romain_Bardet",
  "route-bartali": "Gino_Bartali",
  "route-bobet": "Louison_Bobet",
  "route-boonen": "Tom_Boonen",
  "route-cancellara": "Fabian_Cancellara",
  "route-cavendish": "Mark_Cavendish",
  "route-contador": "Alberto_Contador",
  "route-coppi": "Fausto_Coppi",
  "route-criterium-urbain": "Critérium",
  "route-dauphine": "Critérium_du_Dauphiné",
  "route-directeur-sportif": "Directeur_sportif_(cyclisme)",
  "route-evenepoel": "Remco_Evenepoel",
  "route-frein-patins": "Frein_sur_jante",
  "route-froome": "Chris_Froome",
  "route-galibier": "Col_du_Galibier",
  "route-gilbert": "Philippe_Gilbert",
  "route-girmay": "Biniam_Girmay",
  "route-giro": "Tour_d'Italie",
  "route-gpdenain": "Grand_Prix_de_Denain",
  "route-grace-brown": "Grace_Brown",
  "route-hinault": "Bernard_Hinault",
  "route-indurain": "Miguel_Indurain",
  "route-kelly": "Sean_Kelly_(cyclisme)",
  "route-koppenberg-route": "Vieux_Quaremont",
  "route-kuurne": "Kuurne-Bruxelles-Kuurne",
  "route-lanterne-rouge": "Lanterne_rouge_(cyclisme)",
  "route-laporte": "Christophe_Laporte",
  "route-lbl": "Liège-Bastogne-Liège",
  "route-lemond": "Greg_LeMond",
  "route-lombardie": "Tour_de_Lombardie",
  "route-madouas": "Valentin_Madouas",
  "route-martinez": "Lenny_Martinez",
  "route-merckx": "Eddy_Merckx",
  "route-milansanremo": "Milan-San_Remo",
  "route-mondiaux": "Championnats_du_monde_de_cyclisme_sur_route",
  "route-mortirolo": "Col_du_Mortirolo",
  "route-mur-huy": "Mur_de_Huy",
  "route-muzic": "Évita_Muzic",
  "route-niewiadoma": "Kasia_Niewiadoma",
  "route-pantani": "Marco_Pantani",
  "route-pedersen": "Mads_Pedersen",
  "route-philipsen": "Jasper_Philipsen",
  "route-pinot": "Thibaut_Pinot",
  "route-pogacar": "Tadej_Pogačar",
  "route-poulidor": "Raymond_Poulidor",
  "route-roglic": "Primož_Roglič",
  "route-ronde": "Tour_des_Flandres",
  "route-roubaix": "Paris-Roubaix",
  "route-roue-lenti": "Vélo_de_contre-la-montre",
  "route-seixas": "Paul_Seixas",
  "route-stelvio": "Col_du_Stelvio",
  "route-tdf": "Tour_de_France",
  "route-tdf-femmes": "Tour_de_France_Femmes",
  "route-tourmalet": "Col_du_Tourmalet",
  "route-trobroleon": "Tro_Bro_Leon",
  "route-valverde": "Alejandro_Valverde",
  "route-vanvleuten": "Annemiek_van_Vleuten",
  "route-ventoux": "Mont_Ventoux",
  "route-vingegaard": "Jonas_Vingegaard",
  "route-voiture-balai": "Voiture-balai",
  "route-vollering": "Demi_Vollering",
  "route-wiebes": "Lorena_Wiebes",
  "vtt-absalon": "Julien_Absalon",
  "vtt-atherton": "Rachel_Atherton",
  "vtt-bresset": "Julie_Bresset",
  "vtt-bruni": "Loïc_Bruni",
  "vtt-bunnyhop": "Bunny_hop",
  "vtt-cape-epic": "Cape_Epic",
  "vtt-chausson": "Anne-Caroline_Chausson",
  "vtt-clementz": "Jérôme_Clementz",
  "vtt-dahle": "Gunn-Rita_Dahle_Flesjå",
  "vtt-daudet": "Joris_Daudet",
  "vtt-dropper": "Tige_de_selle",
  "vtt-goldstone": "Jackson_Goldstone",
  "vtt-hart": "Danny_Hart",
  "vtt-hatherly": "Alan_Hatherly",
  "vtt-hill": "Sam_Hill_(cycliste)",
  "vtt-holl": "Valentina_Höll",
  "vtt-koretzky": "Victor_Koretzky",
  "vtt-lecomte": "Loana_Lecomte",
  "vtt-macaskill": "Danny_MacAskill",
  "vtt-marotte": "Maxime_Marotte",
  "vtt-minnaar": "Greg_Minnaar",
  "vtt-neff": "Jolanda_Neff",
  "vtt-nicole": "Myriam_Nicole",
  "vtt-pajon": "Mariana_Pajón",
  "vtt-pedales-plates": "Pédale_de_bicyclette",
  "vtt-pierron": "Amaury_Pierron",
  "vtt-pression-fourche": "Fourche_(vélo)",
  "vtt-pump-track": "Pump_track",
  "vtt-richards": "Evie_Richards",
  "vtt-roc-azur": "Roc_d'Azur",
  "vtt-sarrou": "Jordan_Sarrou",
  "vtt-schurter": "Nino_Schurter",
  "vtt-semi-rigide": "Vélo_tout-terrain",
  "vtt-tomac": "John_Tomac",
  "vtt-transmission-t-type": "Dérailleur",
  "vtt-vergier": "Loris_Vergier",
  "vtt-vouilloz": "Nicolas_Vouilloz"
};

// Catalogue vérifié de photographies Wikimedia Commons sous licences libres (CC0, Public domain, No restrictions, CC BY, CC BY-SA).
// Chaque entrée porte son attribution complète (auteur, licence exacte et lien Commons source).
export const VERIFIED_COMMONS_MEDIA: Record<string, VerifiedCommonsMediaEntry> = {
  "cx-albert": {
    "slug": "Niels_Albert",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3a/Niels_Albert_WK_2007_2.jpg/500px-Niels_Albert_WK_2007_2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Peter Huys",
      "licenseShortName": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Niels_Albert_WK_2007_2.jpg",
      "sourceTitle": "Niels Albert WK 2007 2.jpg"
    }
  },
  "cx-alvarado": {
    "slug": "Ceylin_del_Carmen_Alvarado",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/21/2020_Brussel_Cyclocross_Alvarado2.jpg/500px-2020_Brussel_Cyclocross_Alvarado2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Hoebele",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2020_Brussel_Cyclocross_Alvarado2.jpg",
      "sourceTitle": "2020 Brussel Cyclocross Alvarado2.jpg"
    }
  },
  "cx-benidorm": {
    "slug": "Cyclo-cross_de_Benidorm",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/80/2025-01_Cameron_Mason.jpg/500px-2025-01_Cameron_Mason.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "VeloShutter",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2025-01_Cameron_Mason.jpg",
      "sourceTitle": "2025-01 Cameron Mason.jpg"
    }
  },
  "cx-brand": {
    "slug": "Lucinda_Brand",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2b/2021_WK_Vlaanderen_002_Lucinda_Brand3.jpg/500px-2021_WK_Vlaanderen_002_Lucinda_Brand3.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Hoebele",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2021_WK_Vlaanderen_002_Lucinda_Brand3.jpg",
      "sourceTitle": "2021 WK Vlaanderen 002 Lucinda Brand3.jpg"
    }
  },
  "cx-cant": {
    "slug": "Sanne_Cant",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/92/2020_Brussel_Cyclocross_Cant2.jpg/500px-2020_Brussel_Cyclocross_Cant2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Hoebele",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2020_Brussel_Cyclocross_Cant2.jpg",
      "sourceTitle": "2020 Brussel Cyclocross Cant2.jpg"
    }
  },
  "cx-compton": {
    "slug": "Katherine_Compton",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9f/Katie_Compton.jpg/500px-Katie_Compton.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Thomas Ducroquet",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Katie_Compton.jpg",
      "sourceTitle": "Katie Compton.jpg"
    }
  },
  "cx-crossman-dep": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/91/1992_World_Cyclocross_Championships_%2815171882700%29.jpg/500px-1992_World_Cyclocross_Championships_%2815171882700%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Brian Townsley",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:1992_World_Cyclocross_Championships_(15171882700).jpg",
      "sourceTitle": "1992 World Cyclocross Championships (15171882700).jpg"
    }
  },
  "cx-dufraisse": {
    "slug": "André_Dufraisse",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0b/Andr%C3%A9_Dufraisse%2C_91_ans.jpg/500px-Andr%C3%A9_Dufraisse%2C_91_ans.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Franck Petit",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Andr%C3%A9_Dufraisse,_91_ans.jpg",
      "sourceTitle": "André Dufraisse, 91 ans.jpg"
    }
  },
  "cx-gavere": {
    "slug": "Cyclo-cross_de_Gavere",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/40/Eli_Iserbyt_Cyclocross_Asper-Gavere_2018.jpg/500px-Eli_Iserbyt_Cyclocross_Asper-Gavere_2018.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Aarohowiki",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Eli_Iserbyt_Cyclocross_Asper-Gavere_2018.jpg",
      "sourceTitle": "Eli Iserbyt Cyclocross Asper-Gavere 2018.jpg"
    }
  },
  "cx-grille-depart": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ca/Cyclingworld_Cyclocross_Race_2024%2C_Meerbusch_%28P1170914%29.jpg/500px-Cyclingworld_Cyclocross_Race_2024%2C_Meerbusch_%28P1170914%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Matti Blume",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/deed.en",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Cyclingworld_Cyclocross_Race_2024,_Meerbusch_(P1170914).jpg",
      "sourceTitle": "Cyclingworld Cyclocross Race 2024, Meerbusch (P1170914).jpg"
    }
  },
  "cx-groenendaal": {
    "slug": "Richard_Groenendaal",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/84/Richard-groenendaal-1212605844.jpg/500px-Richard-groenendaal-1212605844.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Danny Lechanteur",
      "licenseShortName": "CC BY 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Richard-groenendaal-1212605844.jpg",
      "sourceTitle": "Richard-groenendaal-1212605844.jpg"
    }
  },
  "cx-iserbyt": {
    "slug": "Eli_Iserbyt",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b5/Eli_Iserbyt_%28BEL%29_2019.jpg/500px-Eli_Iserbyt_%28BEL%29_2019.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Phil Roeder",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Eli_Iserbyt_(BEL)_2019.jpg",
      "sourceTitle": "Eli Iserbyt (BEL) 2019.jpg"
    }
  },
  "cx-koppenberg": {
    "slug": "Koppenbergcross",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5d/Koppenbergcross_2022_1.jpg/500px-Koppenbergcross_2022_1.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Rz98",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Koppenbergcross_2022_1.jpg",
      "sourceTitle": "Koppenbergcross 2022 1.jpg"
    }
  },
  "cx-kupfernagel": {
    "slug": "Hanka_Kupfernagel",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b4/Hanka_Kupfernagel_GPLM_2009.jpg/500px-Hanka_Kupfernagel_GPLM_2009.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Thomas Ducroquet",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Hanka_Kupfernagel_GPLM_2009.jpg",
      "sourceTitle": "Hanka Kupfernagel GPLM 2009.jpg"
    }
  },
  "cx-lavage-karcher": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ae/2018_Jingle_Cross_UCI_Cyclocross_World_Cup_%2844293437994%29.jpg/500px-2018_Jingle_Cross_UCI_Cyclocross_World_Cup_%2844293437994%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Phil Roeder from Des Moines, IA, USA",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2018_Jingle_Cross_UCI_Cyclocross_World_Cup_(44293437994).jpg",
      "sourceTitle": "2018 Jingle Cross UCI Cyclocross World Cup (44293437994).jpg"
    }
  },
  "cx-liboton": {
    "slug": "Roland_Liboton",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/db/Opdracht_AP_erepodium_v.l.n.r._Stamsnijder_%282e%29%2C_Liboton_%281e%29_en_Zweifel_%283e%29%2C_Bestanddeelnr_932-8744.jpg/500px-Opdracht_AP_erepodium_v.l.n.r._Stamsnijder_%282e%29%2C_Liboton_%281e%29_en_Zweifel_%283e%29%2C_Bestanddeelnr_932-8744.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Marcel Antonisse / Anefo",
      "licenseShortName": "CC0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Opdracht_AP_erepodium_v.l.n.r._Stamsnijder_(2e),_Liboton_(1e)_en_Zweifel_(3e),_Bestanddeelnr_932-8744.jpg",
      "sourceTitle": "Opdracht AP erepodium v.l.n.r. Stamsnijder (2e), Liboton (1e) en Zweifel (3e), Bestanddeelnr 932-8744.jpg"
    }
  },
  "cx-loenhout": {
    "slug": "Azencross",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/e/e3/Zden%C4%9Bk_%C5%A0tybar_at_the_Azencross_2012.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
    "attribution": {
      "author": "FakirNL",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Zden%C4%9Bk_%C5%A0tybar_at_the_Azencross_2012.jpg",
      "sourceTitle": "Zdeněk Štybar at the Azencross 2012.jpg"
    }
  },
  "cx-mondiaux": {
    "slug": "Championnats_du_monde_de_cyclo-cross",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ed/2025_UCI_Cyclo-cross_World_Championships_-_Barbora_Bukovsk%C3%A1.jpg/500px-2025_UCI_Cyclo-cross_World_Championships_-_Barbora_Bukovsk%C3%A1.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Felouch Kotek",
      "licenseShortName": "CC0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2025_UCI_Cyclo-cross_World_Championships_-_Barbora_Bukovsk%C3%A1.jpg",
      "sourceTitle": "2025 UCI Cyclo-cross World Championships - Barbora Bukovská.jpg"
    }
  },
  "cx-namur-devers": {
    "slug": "Cyclo-cross_de_Namur",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b6/2018_Citadelcross_Namur_114.jpg/500px-2018_Citadelcross_Namur_114.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Hoebele",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2018_Citadelcross_Namur_114.jpg",
      "sourceTitle": "2018 Citadelcross Namur 114.jpg"
    }
  },
  "cx-nocturne-diegem": {
    "slug": "Cyclo-cross_de_Diegem",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/91/Cameron_Mason_at_Diegem_cyclocross_2025.jpg/500px-Cameron_Mason_at_Diegem_cyclocross_2025.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Spudem",
      "licenseShortName": "CC BY 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Cameron_Mason_at_Diegem_cyclocross_2025.jpg",
      "sourceTitle": "Cameron Mason at Diegem cyclocross 2025.jpg"
    }
  },
  "cx-nys": {
    "slug": "Sven_Nys",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/56/Sven_nys-1516421245.jpg/500px-Sven_nys-1516421245.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Paul Van Welden",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Sven_nys-1516421245.jpg",
      "sourceTitle": "Sven nys-1516421245.jpg"
    }
  },
  "cx-pontchateau": {
    "slug": "Pontchâteau",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/43/Jules_Simon_Pont-Chateau.jpg/500px-Jules_Simon_Pont-Chateau.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "MFonzatti",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Jules_Simon_Pont-Chateau.jpg",
      "sourceTitle": "Jules Simon Pont-Chateau.jpg"
    }
  },
  "cx-portage-sable": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/19/Wheels_Up_%2836993231280%29.jpg/500px-Wheels_Up_%2836993231280%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Phil Roeder from Des Moines, IA, USA",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Wheels_Up_(36993231280).jpg",
      "sourceTitle": "Wheels Up (36993231280).jpg"
    }
  },
  "cx-robic": {
    "slug": "Jean_Robic",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/e/e6/Jean_Robic_%281947%29.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
    "attribution": {
      "author": "Harry Sagers / Anefo",
      "licenseShortName": "CC BY-SA 3.0 nl",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/nl/deed.en",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Jean_Robic_(1947).png",
      "sourceTitle": "Jean Robic (1947).png"
    }
  },
  "cx-ronhaar": {
    "slug": "Pim_Ronhaar",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/58/2024_Tour_de_Wallonie_-_4e_etappe_419_Pim_Ronhaar.jpg/500px-2024_Tour_de_Wallonie_-_4e_etappe_419_Pim_Ronhaar.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Hoebele",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2024_Tour_de_Wallonie_-_4e_etappe_419_Pim_Ronhaar.jpg",
      "sourceTitle": "2024 Tour de Wallonie - 4e etappe 419 Pim Ronhaar.jpg"
    }
  },
  "cx-saut-amazone": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5e/2018_Jingle_Cross_UCI_Cyclocross_World_Cup_%2830076844857%29.jpg/500px-2018_Jingle_Cross_UCI_Cyclocross_World_Cup_%2830076844857%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Phil Roeder from Des Moines, IA, USA",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2018_Jingle_Cross_UCI_Cyclocross_World_Cup_(30076844857).jpg",
      "sourceTitle": "2018 Jingle Cross UCI Cyclocross World Cup (30076844857).jpg"
    }
  },
  "cx-saut-planches": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/72/Cyclocross_runup.JPG/500px-Cyclocross_runup.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Furmanj",
      "licenseShortName": "CC BY-SA 3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Cyclocross_runup.JPG",
      "sourceTitle": "Cyclocross runup.JPG"
    }
  },
  "cx-stybar": {
    "slug": "Zdeněk_Štybar",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b5/Harelbeke_-_E3_Harelbeke%2C_27_maart_2015_%28G16%29.JPG/500px-Harelbeke_-_E3_Harelbeke%2C_27_maart_2015_%28G16%29.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Jérémy-Günther-Heinz Jähnick",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Harelbeke_-_E3_Harelbeke,_27_maart_2015_(G16).JPG",
      "sourceTitle": "Harelbeke - E3 Harelbeke, 27 maart 2015 (G16).JPG"
    }
  },
  "cx-sweeck": {
    "slug": "Laurens_Sweeck",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d4/Tongeren_-_Ronde_van_Limburg%2C_14_juni_2015_%28B052%29.JPG/500px-Tongeren_-_Ronde_van_Limburg%2C_14_juni_2015_%28B052%29.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Jérémy-Günther-Heinz Jähnick",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Tongeren_-_Ronde_van_Limburg,_14_juni_2015_(B052).JPG",
      "sourceTitle": "Tongeren - Ronde van Limburg, 14 juni 2015 (B052).JPG"
    }
  },
  "cx-thibau-nys": {
    "slug": "Thibau_Nys",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4e/Thibau_Nys_-_2023_UCI_Road_World_Championships_%28Men%27s_under-23_road_race%29.jpg/500px-Thibau_Nys_-_2023_UCI_Road_World_Championships_%28Men%27s_under-23_road_race%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Cs-wolves",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Thibau_Nys_-_2023_UCI_Road_World_Championships_(Men%27s_under-23_road_race).jpg",
      "sourceTitle": "Thibau Nys - 2023 UCI Road World Championships (Men's under-23 road race).jpg"
    }
  },
  "cx-vananrooij": {
    "slug": "Shirin_van_Anrooij",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e3/2022_AGR_finish_Shirin_van_Anrooij.jpg/500px-2022_AGR_finish_Shirin_van_Anrooij.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Hoebele",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2022_AGR_finish_Shirin_van_Anrooij.jpg",
      "sourceTitle": "2022 AGR finish Shirin van Anrooij.jpg"
    }
  },
  "cx-vanderhaar": {
    "slug": "Lars_van_der_Haar",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/21/Lars_Van_Der_Haar_%2837204745102%29.jpg/500px-Lars_Van_Der_Haar_%2837204745102%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Phil Roeder from Des Moines, IA, USA",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Lars_Van_Der_Haar_(37204745102).jpg",
      "sourceTitle": "Lars Van Der Haar (37204745102).jpg"
    }
  },
  "cx-vanempel": {
    "slug": "Fem_van_Empel",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/64/Fem_vanEmpel_2023.jpg/500px-Fem_vanEmpel_2023.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "MFonzatti",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Fem_vanEmpel_2023.jpg",
      "sourceTitle": "Fem vanEmpel 2023.jpg"
    }
  },
  "cx-vanthourenhout": {
    "slug": "Michael_Vanthourenhout",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/30/Pont-Ch%C3%A2teau_2023_men_elites_podium_%28cropped%29.jpg/500px-Pont-Ch%C3%A2teau_2023_men_elites_podium_%28cropped%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "MFonzatti",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Pont-Ch%C3%A2teau_2023_men_elites_podium_(cropped).jpg",
      "sourceTitle": "Pont-Château 2023 men elites podium (cropped).jpg"
    }
  },
  "cx-zonhoven-kuil": {
    "slug": "Cyclo-cross_de_Zonhoven",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b4/2019_Superprestige_Zonhoven_men_22.jpg/500px-2019_Superprestige_Zonhoven_men_22.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Hoebele",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2019_Superprestige_Zonhoven_men_22.jpg",
      "sourceTitle": "2019 Superprestige Zonhoven men 22.jpg"
    }
  },
  "piste-andrews": {
    "slug": "Ellesse_Andrews",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1d/Ellesse_Andrews_MNZM_%28cropped%29.jpg/500px-Ellesse_Andrews_MNZM_%28cropped%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Government House, Department of the Prime Minister and Cabinet",
      "licenseShortName": "CC0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Ellesse_Andrews_MNZM_(cropped).jpg",
      "sourceTitle": "Ellesse Andrews MNZM (cropped).jpg"
    }
  },
  "piste-aspi-derny": {
    "slug": "Derny",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fd/Derny_vainqueur_des_500_m%C3%A8tres_de_Deauville_en_1903_sur_motocyclette_Cl%C3%A9ment.jpg/500px-Derny_vainqueur_des_500_m%C3%A8tres_de_Deauville_en_1903_sur_motocyclette_Cl%C3%A9ment.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Jules Beau",
      "licenseShortName": "Public domain",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Derny_vainqueur_des_500_m%C3%A8tres_de_Deauville_en_1903_sur_motocyclette_Cl%C3%A9ment.jpg",
      "sourceTitle": "Derny vainqueur des 500 mètres de Deauville en 1903 sur motocyclette Clément.jpg"
    }
  },
  "piste-bauge": {
    "slug": "Grégory_Baugé",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0c/UCI_Track_World_Championships_2020_012.jpg/500px-UCI_Track_World_Championships_2020_012.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nicola",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:UCI_Track_World_Championships_2020_012.jpg",
      "sourceTitle": "UCI Track World Championships 2020 012.jpg"
    }
  },
  "piste-bthomas": {
    "slug": "Benjamin_Thomas",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9c/2017_UEC_Track_Elite_European_Championships_226.jpg/500px-2017_UEC_Track_Elite_European_Championships_226.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nicola",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2017_UEC_Track_Elite_European_Championships_226.jpg",
      "sourceTitle": "2017 UEC Track Elite European Championships 226.jpg"
    }
  },
  "piste-casque-visiere": {
    "slug": "Casque_de_vélo",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ae/Casque_v%C3%A9lo_de_course.jpg/500px-Casque_v%C3%A9lo_de_course.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Ludovic Péron",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Casque_v%C3%A9lo_de_course.jpg",
      "sourceTitle": "Casque vélo de course.jpg"
    }
  },
  "piste-copponi": {
    "slug": "Clara_Copponi",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f4/2019_UEC_Track_Elite_European_Championships_045.jpg/500px-2019_UEC_Track_Elite_European_Championships_045.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nicola",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2019_UEC_Track_Elite_European_Championships_045.jpg",
      "sourceTitle": "2019 UEC Track Elite European Championships 045.jpg"
    }
  },
  "piste-course-points": {
    "slug": "Course_aux_points",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/20/Lizzie_Armistead_-_Flickr_-_johnthescone.jpg/500px-Lizzie_Armistead_-_Flickr_-_johnthescone.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "johnthescone from Sheffield",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Lizzie_Armistead_-_Flickr_-_johnthescone.jpg",
      "sourceTitle": "Lizzie Armistead - Flickr - johnthescone.jpg"
    }
  },
  "piste-course-tempo": {
    "slug": "Course_tempo",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/6/63/Podium_women%27s_points_race_-_2008_European_Track_Championships.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
    "attribution": {
      "author": "Sander.v.Ginkel",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Podium_women%27s_points_race_-_2008_European_Track_Championships.jpg",
      "sourceTitle": "Podium women's points race - 2008 European Track Championships.jpg"
    }
  },
  "piste-elimination": {
    "slug": "Course_par_élimination",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/0/05/Start_of_the_women%27s_elimination_race_of_the_omnium.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
    "attribution": {
      "author": "Sander.v.Ginkel",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Start_of_the_women%27s_elimination_race_of_the_omnium.jpg",
      "sourceTitle": "Start of the women's elimination race of the omnium.jpg"
    }
  },
  "piste-ganna": {
    "slug": "Filippo_Ganna",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fa/2022-08-17_European_Championships_2022_%E2%80%93_Road_Cycling_Men%27s_Time_Trial_by_Sandro_Halank%E2%80%93103.jpg/500px-2022-08-17_European_Championships_2022_%E2%80%93_Road_Cycling_Men%27s_Time_Trial_by_Sandro_Halank%E2%80%93103.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Sandro Halank , Wikimedia Commons",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2022-08-17_European_Championships_2022_%E2%80%93_Road_Cycling_Men%27s_Time_Trial_by_Sandro_Halank%E2%80%93103.jpg",
      "sourceTitle": "2022-08-17 European Championships 2022 – Road Cycling Men's Time Trial by Sandro Halank–103.jpg"
    }
  },
  "piste-gros": {
    "slug": "Mathilde_Gros",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/72/2022-08-15_202744_UEC_Track_Elite_European_Championships_%28cropped%29.jpg/500px-2022-08-15_202744_UEC_Track_Elite_European_Championships_%28cropped%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Tim Rademacher",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2022-08-15_202744_UEC_Track_Elite_European_Championships_(cropped).jpg",
      "sourceTitle": "2022-08-15 202744 UEC Track Elite European Championships (cropped).jpg"
    }
  },
  "piste-hoy": {
    "slug": "Chris_Hoy",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/59/UCI_Track_World_Championships_2020_110_%282%29.jpg/500px-UCI_Track_World_Championships_2020_110_%282%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nicola",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:UCI_Track_World_Championships_2020_110_(2).jpg",
      "sourceTitle": "UCI Track World Championships 2020 110 (2).jpg"
    }
  },
  "piste-keirin-epreuve": {
    "slug": "Keirin",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/77/ColwoodKeirin.jpg/500px-ColwoodKeirin.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "FigBug",
      "licenseShortName": "CC BY-SA 3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:ColwoodKeirin.jpg",
      "sourceTitle": "ColwoodKeirin.jpg"
    }
  },
  "piste-kenny": {
    "slug": "Laura_Kenny",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1f/2015_UEC_Track_Elite_European_Championships_118.JPG/500px-2015_UEC_Track_Elite_European_Championships_118.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nicola",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2015_UEC_Track_Elite_European_Championships_118.JPG",
      "sourceTitle": "2015 UEC Track Elite European Championships 118.JPG"
    }
  },
  "piste-kilometre": {
    "slug": "Kilomètre_(cyclisme)",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0a/Vogel_Start_500_Meter.jpg/500px-Vogel_Start_500_Meter.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nicola",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Vogel_Start_500_Meter.jpg",
      "sourceTitle": "Vogel Start 500 Meter.jpg"
    }
  },
  "piste-lavreysen": {
    "slug": "Harrie_Lavreysen",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ee/2017_UEC_Track_Elite_European_Championships_017.jpg/500px-2017_UEC_Track_Elite_European_Championships_017.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nicola",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2017_UEC_Track_Elite_European_Championships_017.jpg",
      "sourceTitle": "2017 UEC Track Elite European Championships 017.jpg"
    }
  },
  "piste-levier": {
    "slug": "Vitesse_par_équipes",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3d/Qualifikation_Teamsprint_deutsches_Team.jpg/500px-Qualifikation_Teamsprint_deutsches_Team.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nicola",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Qualifikation_Teamsprint_deutsches_Team.jpg",
      "sourceTitle": "Qualifikation Teamsprint deutsches Team.jpg"
    }
  },
  "piste-ligne-noire": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4c/Velodrome_parc_tete_d%27or_3.jpg/500px-Velodrome_parc_tete_d%27or_3.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "User:Jejecam",
      "licenseShortName": "CC BY-SA 3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Velodrome_parc_tete_d%27or_3.jpg",
      "sourceTitle": "Velodrome parc tete d'or 3.jpg"
    }
  },
  "piste-manchester": {
    "slug": "Vélodrome_de_Manchester",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/93/National_Cycling_Centre_-_Velodrome_-_geograph.org.uk_-_1595.jpg/500px-National_Cycling_Centre_-_Velodrome_-_geograph.org.uk_-_1595.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Gary Barber",
      "licenseShortName": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:National_Cycling_Centre_-_Velodrome_-_geograph.org.uk_-_1595.jpg",
      "sourceTitle": "National Cycling Centre - Velodrome - geograph.org.uk - 1595.jpg"
    }
  },
  "piste-meares": {
    "slug": "Anna_Meares",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/41/Anna_Meares_2.jpg/500px-Anna_Meares_2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Blnguyen/ en:User:YellowMonkey",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Anna_Meares_2.jpg",
      "sourceTitle": "Anna Meares 2.jpg"
    }
  },
  "piste-morelon": {
    "slug": "Daniel_Morelon",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ea/Daniel_Morelon.JPG/500px-Daniel_Morelon.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nicola",
      "licenseShortName": "CC BY-SA 3.0 de",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/de/deed.en",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Daniel_Morelon.JPG",
      "sourceTitle": "Daniel Morelon.JPG"
    }
  },
  "piste-omnium-epreuve": {
    "slug": "Omnium",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/d/da/Start_of_the_women%27s_elimination_race_of_the_omnium_%282%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
    "attribution": {
      "author": "Sander.v.Ginkel",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Start_of_the_women%27s_elimination_race_of_the_omnium_(2).jpg",
      "sourceTitle": "Start of the women's elimination race of the omnium (2).jpg"
    }
  },
  "piste-pendleton": {
    "slug": "Victoria_Pendleton",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9f/Victoria_Pendleton_2011.jpg/500px-Victoria_Pendleton_2011.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nicola",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Victoria_Pendleton_2011.jpg",
      "sourceTitle": "Victoria Pendleton 2011.jpg"
    }
  },
  "piste-pervis": {
    "slug": "François_Pervis",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a6/2015_UEC_Track_Elite_European_Championships_46.JPG/500px-2015_UEC_Track_Elite_European_Championships_46.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nicola",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2015_UEC_Track_Elite_European_Championships_46.JPG",
      "sourceTitle": "2015 UEC Track Elite European Championships 46.JPG"
    }
  },
  "piste-pignon-fixe": {
    "slug": "Pignon_fixe",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cc/Fixed-gear-cogs.jpg/500px-Fixed-gear-cogs.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Contributeur Wikimedia Commons",
      "licenseShortName": "CC BY-SA 2.5",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.5",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Fixed-gear-cogs.jpg",
      "sourceTitle": "Fixed-gear-cogs.jpg"
    }
  },
  "piste-poursuite-eq": {
    "slug": "Poursuite_par_équipes",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c6/2015_UEC_Track_Elite_European_Championships_150.JPG/500px-2015_UEC_Track_Elite_European_Championships_150.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nicola",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2015_UEC_Track_Elite_European_Championships_150.JPG",
      "sourceTitle": "2015 UEC Track Elite European Championships 150.JPG"
    }
  },
  "piste-poursuite-ind": {
    "slug": "Poursuite_individuelle",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/88/Rob_Hayles_-_Men%27s_Individual_Pursuit.jpg/500px-Rob_Hayles_-_Men%27s_Individual_Pursuit.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "johnthescone from Sheffield",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Rob_Hayles_-_Men%27s_Individual_Pursuit.jpg",
      "sourceTitle": "Rob Hayles - Men's Individual Pursuit.jpg"
    }
  },
  "piste-prise-tour": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/48/Kim_Geist%2C_Junior_Track_Nationals_%2830533177%29.jpg/500px-Kim_Geist%2C_Junior_Track_Nationals_%2830533177%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Steve Ryan from Monterey, CA, USA",
      "licenseShortName": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Kim_Geist,_Junior_Track_Nationals_(30533177).jpg",
      "sourceTitle": "Kim Geist, Junior Track Nationals (30533177).jpg"
    }
  },
  "piste-recordheure": {
    "slug": "Record_de_l'heure_cycliste",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4a/Manchester_Velodrome.jpg/500px-Manchester_Velodrome.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Liz Dawson",
      "licenseShortName": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Manchester_Velodrome.jpg",
      "sourceTitle": "Manchester Velodrome.jpg"
    }
  },
  "piste-relais-madison": {
    "slug": "Course_à_l'américaine_(cyclisme)",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6a/The_Wheel_and_cycling_trade_review_%281896%29_%2814774919081%29.jpg/500px-The_Wheel_and_cycling_trade_review_%281896%29_%2814774919081%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Internet Archive Book Images",
      "licenseShortName": "No restrictions",
      "licenseUrl": "https://www.flickr.com/commons/usage/",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:The_Wheel_and_cycling_trade_review_(1896)_(14774919081).jpg",
      "sourceTitle": "The Wheel and cycling trade review (1896) (14774919081).jpg"
    }
  },
  "piste-richardson": {
    "slug": "Matthew_Richardson_(cyclisme)",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a2/Matthew_Richardson_WCh_2020.jpg/500px-Matthew_Richardson_WCh_2020.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "crop by Leonprimer",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Matthew_Richardson_WCh_2020.jpg",
      "sourceTitle": "Matthew Richardson WCh 2020.jpg"
    }
  },
  "piste-roue-batons": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/98/US_Pro_Cycling_Championships_Greenville_South_Carolina_175.jpg/500px-US_Pro_Cycling_Championships_Greenville_South_Carolina_175.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Glory Cycles",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:US_Pro_Cycling_Championships_Greenville_South_Carolina_175.jpg",
      "sourceTitle": "US Pro Cycling Championships Greenville South Carolina 175.jpg"
    }
  },
  "piste-rousseau": {
    "slug": "Florian_Rousseau",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/63/Florian_Rousseau_2012.jpg/500px-Florian_Rousseau_2012.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nicola",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Florian_Rousseau_2012.jpg",
      "sourceTitle": "Florian Rousseau 2012.jpg"
    }
  },
  "piste-scratch": {
    "slug": "Course_scratch",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/44/Scratch_femme_13.jpg/500px-Scratch_femme_13.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Cyrille Largillier",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Scratch_femme_13.jpg",
      "sourceTitle": "Scratch femme 13.jpg"
    }
  },
  "piste-sixjours": {
    "slug": "Course_de_six_jours",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ec/Iljo_Keisse_Robert_Bartko_Sixdays_Z%C3%BCrich_2007-2008.jpg/500px-Iljo_Keisse_Robert_Bartko_Sixdays_Z%C3%BCrich_2007-2008.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "tetedelacourse",
      "licenseShortName": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Iljo_Keisse_Robert_Bartko_Sixdays_Z%C3%BCrich_2007-2008.jpg",
      "sourceTitle": "Iljo Keisse Robert Bartko Sixdays Zürich 2007-2008.jpg"
    }
  },
  "piste-sqy-national": {
    "slug": "Vélodrome_national_de_Saint-Quentin-en-Yvelines",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/34/2024_Summer_Paralympics_-_Cycling_05.jpg/500px-2024_Summer_Paralympics_-_Cycling_05.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Gail Leenstra",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2024_Summer_Paralympics_-_Cycling_05.jpg",
      "sourceTitle": "2024 Summer Paralympics - Cycling 05.jpg"
    }
  },
  "piste-stagiaire-club": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/Behind_Bigger_Motors_at_Frankfurt_%2812343885584%29.jpg/500px-Behind_Bigger_Motors_at_Frankfurt_%2812343885584%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Brian Townsley",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Behind_Bigger_Motors_at_Frankfurt_(12343885584).jpg",
      "sourceTitle": "Behind Bigger Motors at Frankfurt (12343885584).jpg"
    }
  },
  "piste-surplace": {
    "slug": "Surplace",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/51/Track_stand_Atlanta_CM.jpg/500px-Track_stand_Atlanta_CM.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Scott Ehardt",
      "licenseShortName": "Public domain",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Track_stand_Atlanta_CM.jpg",
      "sourceTitle": "Track stand Atlanta CM.jpg"
    }
  },
  "piste-tandem-para": {
    "slug": "Paracyclisme",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f9/2024_Summer_Paralympics_-_Cycling_15.jpg/500px-2024_Summer_Paralympics_-_Cycling_15.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Gail Leenstra",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2024_Summer_Paralympics_-_Cycling_15.jpg",
      "sourceTitle": "2024 Summer Paralympics - Cycling 15.jpg"
    }
  },
  "piste-tournant": {
    "slug": "Arnaud_Tournant",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7e/Arnaud_Tournant_-_Six_jours_de_Grenoble_2011.jpg/500px-Arnaud_Tournant_-_Six_jours_de_Grenoble_2011.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Matthieu Riegler English : This photo has been taken by Matthieu Riegler ( User:Kyro ) and released ",
      "licenseShortName": "CC BY 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Arnaud_Tournant_-_Six_jours_de_Grenoble_2011.jpg",
      "sourceTitle": "Arnaud Tournant - Six jours de Grenoble 2011.jpg"
    }
  },
  "piste-veloroubaix": {
    "slug": "Vélodrome_André-Pétrieux",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/05/Roubaix%2C_V%C3%A9lodrome.jpg/500px-Roubaix%2C_V%C3%A9lodrome.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nicolas von Kospoth ( Triggerhappy )",
      "licenseShortName": "CC BY-SA 2.5",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.5",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Roubaix,_V%C3%A9lodrome.jpg",
      "sourceTitle": "Roubaix, Vélodrome.jpg"
    }
  },
  "piste-vigier": {
    "slug": "Sébastien_Vigier",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ac/2017_UEC_Track_Elite_European_Championships_229.jpg/500px-2017_UEC_Track_Elite_European_Championships_229.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nicola",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2017_UEC_Track_Elite_European_Championships_229.jpg",
      "sourceTitle": "2017 UEC Track Elite European Championships 229.jpg"
    }
  },
  "piste-vigorelli": {
    "slug": "Vélodrome_Maspes-Vigorelli",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/46/Velodromo_Vigorelli_2018_veduta_dall%27alto.jpg/500px-Velodromo_Vigorelli_2018_veduta_dall%27alto.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Minnitre",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Velodromo_Vigorelli_2018_veduta_dall%27alto.jpg",
      "sourceTitle": "Velodromo Vigorelli 2018 veduta dall'alto.jpg"
    }
  },
  "piste-virage-sqy": {
    "slug": "Vélodrome_national_de_Saint-Quentin-en-Yvelines",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2e/Journ%C3%A9e_portes_ouvertes_au_v%C3%A9lodrome_de_Saint-Quentin-en-Yvelines_le_1er_f%C3%A9vrier_2014_-_78.jpg/500px-Journ%C3%A9e_portes_ouvertes_au_v%C3%A9lodrome_de_Saint-Quentin-en-Yvelines_le_1er_f%C3%A9vrier_2014_-_78.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Lionel Allorge",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Journ%C3%A9e_portes_ouvertes_au_v%C3%A9lodrome_de_Saint-Quentin-en-Yvelines_le_1er_f%C3%A9vrier_2014_-_78.jpg",
      "sourceTitle": "Journée portes ouvertes au vélodrome de Saint-Quentin-en-Yvelines le 1er février 2014 - 78.jpg"
    }
  },
  "piste-viviani": {
    "slug": "Elia_Viviani",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7d/GIR30183_viviani_%2842462550871%29.jpg/500px-GIR30183_viviani_%2842462550871%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "filip bossuyt from Kortrijk, Belgium",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:GIR30183_viviani_(42462550871).jpg",
      "sourceTitle": "GIR30183 viviani (42462550871).jpg"
    }
  },
  "piste-vogel": {
    "slug": "Kristina_Vogel",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ae/Deutsche_Meisterschaften_im_Bahnradsport_2022_068_Kristina_Vogel.jpg/500px-Deutsche_Meisterschaften_im_Bahnradsport_2022_068_Kristina_Vogel.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nicola",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Deutsche_Meisterschaften_im_Bahnradsport_2022_068_Kristina_Vogel.jpg",
      "sourceTitle": "Deutsche Meisterschaften im Bahnradsport 2022 068 Kristina Vogel.jpg"
    }
  },
  "piste-wiggins": {
    "slug": "Bradley_Wiggins",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/7/7c/Bradley_Wiggins_CD_2011.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
    "attribution": {
      "author": "Petit Brun",
      "licenseShortName": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Bradley_Wiggins_CD_2011.jpg",
      "sourceTitle": "Bradley Wiggins CD 2011.jpg"
    }
  },
  "piste-wild": {
    "slug": "Kirsten_Wild",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2b/2018_Women%27s_Tour_de_Yorkshire_-_Kirsten_Wild.jpg/500px-2018_Women%27s_Tour_de_Yorkshire_-_Kirsten_Wild.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Cs-wolves",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2018_Women%27s_Tour_de_Yorkshire_-_Kirsten_Wild.jpg",
      "sourceTitle": "2018 Women's Tour de Yorkshire - Kirsten Wild.jpg"
    }
  },
  "poly-cadence-sprint": {
    "slug": "Sprint_(cyclisme)",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2f/Sprint_00.jpg/500px-Sprint_00.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Kuebi",
      "licenseShortName": "CC BY-SA 3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Sprint_00.jpg",
      "sourceTitle": "Sprint 00.jpg"
    }
  },
  "poly-capteur-watts": {
    "slug": "Capteur_de_puissance_(cyclisme)",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d8/SRAM_Quarq_ELSA_10R_Power_Meter_02.jpg/500px-SRAM_Quarq_ELSA_10R_Power_Meter_02.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Glory Cycles",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:SRAM_Quarq_ELSA_10R_Power_Meter_02.jpg",
      "sourceTitle": "SRAM Quarq ELSA 10R Power Meter 02.jpg"
    }
  },
  "poly-entrainement-stage": {
    "slug": "Teide",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/29/Roque_Cinchado_und_Teide_%28Zuschnitt%29.jpg/500px-Roque_Cinchado_und_Teide_%28Zuschnitt%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Thomas Wolf , www.foto-tw.de",
      "licenseShortName": "CC BY-SA 3.0 de",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/de/deed.en",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Roque_Cinchado_und_Teide_(Zuschnitt).jpg",
      "sourceTitle": "Roque Cinchado und Teide (Zuschnitt).jpg"
    }
  },
  "poly-jeanjean": {
    "slug": "Anthony_Jeanjean",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/96/Anthony_Jeanjean_2020.jpg/500px-Anthony_Jeanjean_2020.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "NICOLAS MENNETREY",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Anthony_Jeanjean_2020.jpg",
      "sourceTitle": "Anthony Jeanjean 2020.jpg"
    }
  },
  "poly-kopecky": {
    "slug": "Lotte_Kopecky",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5f/Lotte_Kopecky_poseert_in_KOERSkaffee_%28cropped%29.jpg/500px-Lotte_Kopecky_poseert_in_KOERSkaffee_%28cropped%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Diethard.Vlaeminck",
      "licenseShortName": "CC BY 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Lotte_Kopecky_poseert_in_KOERSkaffee_(cropped).jpg",
      "sourceTitle": "Lotte Kopecky poseert in KOERSkaffee (cropped).jpg"
    }
  },
  "poly-leaute": {
    "slug": "Alexandre_Léauté",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/92/Alexandre_L%C3%A9aut%C3%A9_-_Paris_2024_-_French_delegation_Parade_%28cropped%29.jpg/500px-Alexandre_L%C3%A9aut%C3%A9_-_Paris_2024_-_French_delegation_Parade_%28cropped%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nicolas22g",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Alexandre_L%C3%A9aut%C3%A9_-_Paris_2024_-_French_delegation_Parade_(cropped).jpg",
      "sourceTitle": "Alexandre Léauté - Paris 2024 - French delegation Parade (cropped).jpg"
    }
  },
  "poly-longo": {
    "slug": "Jeannie_Longo",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8a/Jeannie_Longo_-_6_jours_de_Grenoble_2011.jpg/500px-Jeannie_Longo_-_6_jours_de_Grenoble_2011.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Matthieu Riegler English : This photo has been taken by Matthieu Riegler ( User:Kyro ) and released ",
      "licenseShortName": "CC BY 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Jeannie_Longo_-_6_jours_de_Grenoble_2011.jpg",
      "sourceTitle": "Jeannie Longo - 6 jours de Grenoble 2011.jpg"
    }
  },
  "poly-mohoric": {
    "slug": "Matej_Mohorič",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6e/Matej_Mohori%C4%8D_Paris-Roubaix_2022.jpg/500px-Matej_Mohori%C4%8D_Paris-Roubaix_2022.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Clémence LN",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Matej_Mohori%C4%8D_Paris-Roubaix_2022.jpg",
      "sourceTitle": "Matej Mohorič Paris-Roubaix 2022.jpg"
    }
  },
  "poly-mvdp": {
    "slug": "Mathieu_van_der_Poel",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/08/MVDP-PR2024.jpg/500px-MVDP-PR2024.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Clémence LN",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:MVDP-PR2024.jpg",
      "sourceTitle": "MVDP-PR2024.jpg"
    }
  },
  "poly-paris-brest": {
    "slug": "Paris-Brest-Paris_randonneur",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/8/8e/Bj%C3%B6rn_Lenhard.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
    "attribution": {
      "author": "Jmax",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Bj%C3%B6rn_Lenhard.jpg",
      "sourceTitle": "Björn Lenhard.jpg"
    }
  },
  "poly-pfp": {
    "slug": "Pauline_Ferrand-Prévot",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bb/Javen%C3%A92025_074_Pauline_Ferrand-Pr%C3%A9vot.jpg/500px-Javen%C3%A92025_074_Pauline_Ferrand-Pr%C3%A9vot.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "MFonzatti",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Javen%C3%A92025_074_Pauline_Ferrand-Pr%C3%A9vot.jpg",
      "sourceTitle": "Javené2025 074 Pauline Ferrand-Prévot.jpg"
    }
  },
  "poly-pidcock": {
    "slug": "Tom_Pidcock",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/39/Tom_Pidcock_%282023%29.jpg/500px-Tom_Pidcock_%282023%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Joost Pauwels",
      "licenseShortName": "CC0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Tom_Pidcock_(2023).jpg",
      "sourceTitle": "Tom Pidcock (2023).jpg"
    }
  },
  "poly-pieterse": {
    "slug": "Puck_Pieterse",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2b/2022_EK_Namur_WU_podium_Puck_Pieterse.jpg/500px-2022_EK_Namur_WU_podium_Puck_Pieterse.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Hoebele",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2022_EK_Namur_WU_podium_Puck_Pieterse.jpg",
      "sourceTitle": "2022 EK Namur WU podium Puck Pieterse.jpg"
    }
  },
  "poly-pneu-gravel-42": {
    "slug": "Gravel_(vélo)",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2c/Fyxation_Carbon_Adventure.jpg/500px-Fyxation_Carbon_Adventure.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Tim Reddington",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Fyxation_Carbon_Adventure.jpg",
      "sourceTitle": "Fyxation Carbon Adventure.jpg"
    }
  },
  "poly-sagan": {
    "slug": "Peter_Sagan",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/52/Peter_Sagan_TDF2022.jpg/500px-Peter_Sagan_TDF2022.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Clémence LN",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Peter_Sagan_TDF2022.jpg",
      "sourceTitle": "Peter Sagan TDF2022.jpg"
    }
  },
  "poly-storey": {
    "slug": "Sarah_Storey",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/70/Sarah_Storey_medals_%28cropped%29.jpg/500px-Sarah_Storey_medals_%28cropped%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Bill",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Sarah_Storey_medals_(cropped).jpg",
      "sourceTitle": "Sarah Storey medals (cropped).jpg"
    }
  },
  "poly-strade-bianche": {
    "slug": "Strade_Bianche",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/57/Strade_bianche_hommes_2018.png/500px-Strade_bianche_hommes_2018.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Psemdel",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Strade_bianche_hommes_2018.png",
      "sourceTitle": "Strade bianche hommes 2018.png"
    }
  },
  "poly-vos": {
    "slug": "Marianne_Vos",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/Jumbo_tour_de_france_reims_1408748.jpg/500px-Jumbo_tour_de_france_reims_1408748.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "G.Garitan",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Jumbo_tour_de_france_reims_1408748.jpg",
      "sourceTitle": "Jumbo tour de france reims 1408748.jpg"
    }
  },
  "poly-wva": {
    "slug": "Wout_van_Aert",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ed/WVA_Paris-Roubaix_2022.jpg/500px-WVA_Paris-Roubaix_2022.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Clémence LN",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:WVA_Paris-Roubaix_2022.jpg",
      "sourceTitle": "WVA Paris-Roubaix 2022.jpg"
    }
  },
  "route-alaphilippe": {
    "slug": "Julian_Alaphilippe",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f6/2018_Tour_of_Britain_stage_3_-_stage_winner_Julian_Alaphilippe_%28cropped%29.JPG/500px-2018_Tour_of_Britain_stage_3_-_stage_winner_Julian_Alaphilippe_%28cropped%29.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Geof Sheppard",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2018_Tour_of_Britain_stage_3_-_stage_winner_Julian_Alaphilippe_(cropped).JPG",
      "sourceTitle": "2018 Tour of Britain stage 3 - stage winner Julian Alaphilippe (cropped).JPG"
    }
  },
  "route-alpedhuez": {
    "slug": "Alpe_d'Huez",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/75/Alpes_huez_pano_02_sign.jpg/500px-Alpes_huez_pano_02_sign.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Gilles Perréal",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Alpes_huez_pano_02_sign.jpg",
      "sourceTitle": "Alpes huez pano 02 sign.jpg"
    }
  },
  "route-angliru": {
    "slug": "Alto_de_l'Angliru",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/78/El_angliru_desde_el_Monsacro.jpg/500px-El_angliru_desde_el_Monsacro.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Contributeur Wikimedia Commons",
      "licenseShortName": "CC BY-SA 3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:El_angliru_desde_el_Monsacro.jpg",
      "sourceTitle": "El angliru desde el Monsacro.jpg"
    }
  },
  "route-anquetil": {
    "slug": "Jacques_Anquetil",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b2/Jacques_Anquetil_1966.jpg/500px-Jacques_Anquetil_1966.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Giorgio Lotti",
      "licenseShortName": "Public domain",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Jacques_Anquetil_1966.jpg",
      "sourceTitle": "Jacques Anquetil 1966.jpg"
    }
  },
  "route-arenberg": {
    "slug": "Trouée_d'Arenberg",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6e/Trou%C3%A9e_d%27Arenberg.png/500px-Trou%C3%A9e_d%27Arenberg.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Fanny Schertzer",
      "licenseShortName": "CC BY 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Trou%C3%A9e_d%27Arenberg.png",
      "sourceTitle": "Trouée d'Arenberg.png"
    }
  },
  "route-bardet": {
    "slug": "Romain_Bardet",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c8/Tour_de_l%27Ain_2014_-_Romain_Bardet.jpg/500px-Tour_de_l%27Ain_2014_-_Romain_Bardet.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Benoît Prieur",
      "licenseShortName": "CC0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Tour_de_l%27Ain_2014_-_Romain_Bardet.jpg",
      "sourceTitle": "Tour de l'Ain 2014 - Romain Bardet.jpg"
    }
  },
  "route-bartali": {
    "slug": "Gino_Bartali",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/b/b6/Gino_Bartali.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
    "attribution": {
      "author": "Fulgur Photo-Press. Fotograaf onbekend/Unknown photographer. Collectie SPAARNESTAD PHOTO",
      "licenseShortName": "Public domain",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Gino_Bartali.jpg",
      "sourceTitle": "Gino Bartali.jpg"
    }
  },
  "route-bobet": {
    "slug": "Louison_Bobet",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1a/LouisonBobet-StudioHarcourt-1956.png/500px-LouisonBobet-StudioHarcourt-1956.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Studio Harcourt.",
      "licenseShortName": "Public domain",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:LouisonBobet-StudioHarcourt-1956.png",
      "sourceTitle": "LouisonBobet-StudioHarcourt-1956.png"
    }
  },
  "route-boonen": {
    "slug": "Tom_Boonen",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8d/Gent_-_Omloop_Het_Nieuwsblad%2C_28_februari_2015_%28E04%29.JPG/500px-Gent_-_Omloop_Het_Nieuwsblad%2C_28_februari_2015_%28E04%29.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Jérémy-Günther-Heinz Jähnick",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Gent_-_Omloop_Het_Nieuwsblad,_28_februari_2015_(E04).JPG",
      "sourceTitle": "Gent - Omloop Het Nieuwsblad, 28 februari 2015 (E04).JPG"
    }
  },
  "route-cancellara": {
    "slug": "Fabian_Cancellara",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e0/Cancellara_Fabian_2007.JPG/500px-Cancellara_Fabian_2007.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "The original uploader was Fliedermaus at Luxembourgish Wikipedia .",
      "licenseShortName": "CC BY-SA 1.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/1.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Cancellara_Fabian_2007.JPG",
      "sourceTitle": "Cancellara Fabian 2007.JPG"
    }
  },
  "route-cavendish": {
    "slug": "Mark_Cavendish",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0b/Mark_Cavendish_2016.jpg/500px-Mark_Cavendish_2016.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Cs-wolves",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Mark_Cavendish_2016.jpg",
      "sourceTitle": "Mark Cavendish 2016.jpg"
    }
  },
  "route-contador": {
    "slug": "Alberto_Contador",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7a/2015_Tour_de_France_team_presentation%2C_Alberto_Contador_%28cropped%29.jpg/500px-2015_Tour_de_France_team_presentation%2C_Alberto_Contador_%28cropped%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "bert de boer",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2015_Tour_de_France_team_presentation,_Alberto_Contador_(cropped).jpg",
      "sourceTitle": "2015 Tour de France team presentation, Alberto Contador (cropped).jpg"
    }
  },
  "route-coppi": {
    "slug": "Fausto_Coppi",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/34/Fausto_Coppi%2C_Tour_de_France_1952_01_%28cropped%29.jpg/500px-Fausto_Coppi%2C_Tour_de_France_1952_01_%28cropped%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "J.D. Noske (Anefo)",
      "licenseShortName": "CC BY-SA 3.0 nl",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/nl/deed.en",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Fausto_Coppi,_Tour_de_France_1952_01_(cropped).jpg",
      "sourceTitle": "Fausto Coppi, Tour de France 1952 01 (cropped).jpg"
    }
  },
  "route-criterium-urbain": {
    "slug": "Critérium",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8b/1._Fixedgear_Crit%2C_Meerbusch_%28P1180041-RR%29.jpg/500px-1._Fixedgear_Crit%2C_Meerbusch_%28P1180041-RR%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Matti Blume",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/deed.en",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:1._Fixedgear_Crit,_Meerbusch_(P1180041-RR).jpg",
      "sourceTitle": "1. Fixedgear Crit, Meerbusch (P1180041-RR).jpg"
    }
  },
  "route-dauphine": {
    "slug": "Critérium_du_Dauphiné",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8f/Crit%C3%A9rium_du_Dauphin%C3%A9_2014_-_Etape_6_-Peloton_au_ravitaillement_%281%29.jpg/500px-Crit%C3%A9rium_du_Dauphin%C3%A9_2014_-_Etape_6_-Peloton_au_ravitaillement_%281%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Ludovic Péron",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Crit%C3%A9rium_du_Dauphin%C3%A9_2014_-_Etape_6_-Peloton_au_ravitaillement_(1).jpg",
      "sourceTitle": "Critérium du Dauphiné 2014 - Etape 6 -Peloton au ravitaillement (1).jpg"
    }
  },
  "route-directeur-sportif": {
    "slug": "Directeur_sportif_(cyclisme)",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/ff/18th_stage_Tour_de_France_2025_%2882%29.jpg/500px-18th_stage_Tour_de_France_2025_%2882%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Tournasol7",
      "licenseShortName": "CC BY 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:18th_stage_Tour_de_France_2025_(82).jpg",
      "sourceTitle": "18th stage Tour de France 2025 (82).jpg"
    }
  },
  "route-equipier-plaine": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e8/Gele_Trui_Schleck_2011_-_frontaal.jpg/500px-Gele_Trui_Schleck_2011_-_frontaal.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nike",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Gele_Trui_Schleck_2011_-_frontaal.jpg",
      "sourceTitle": "Gele Trui Schleck 2011 - frontaal.jpg"
    }
  },
  "route-evenepoel": {
    "slug": "Remco_Evenepoel",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6f/Remco_Evenepoel_WC_2022.jpg/500px-Remco_Evenepoel_WC_2022.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Matheusikidia",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Remco_Evenepoel_WC_2022.jpg",
      "sourceTitle": "Remco Evenepoel WC 2022.jpg"
    }
  },
  "route-frein-patins": {
    "slug": "Frein_sur_jante",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/39/Shimanoexagebrake.jpg/500px-Shimanoexagebrake.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Rado bladteth Rzeznicki",
      "licenseShortName": "Public domain",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Shimanoexagebrake.jpg",
      "sourceTitle": "Shimanoexagebrake.jpg"
    }
  },
  "route-froome": {
    "slug": "Chris_Froome",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d9/Chris_Froome_2022.jpg/500px-Chris_Froome_2022.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Chris Froome",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Chris_Froome_2022.jpg",
      "sourceTitle": "Chris Froome 2022.jpg"
    }
  },
  "route-galibier": {
    "slug": "Col_du_Galibier",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c9/Galibier.jpg/500px-Galibier.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Stephan Brunker",
      "licenseShortName": "CC BY-SA 3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Galibier.jpg",
      "sourceTitle": "Galibier.jpg"
    }
  },
  "route-gilbert": {
    "slug": "Philippe_Gilbert",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f7/Philippe_Gilbert%2C_2020_Paris-Nice.jpg/500px-Philippe_Gilbert%2C_2020_Paris-Nice.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Claudio Martino",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Philippe_Gilbert,_2020_Paris-Nice.jpg",
      "sourceTitle": "Philippe Gilbert, 2020 Paris-Nice.jpg"
    }
  },
  "route-girmay": {
    "slug": "Biniam_Girmay",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8d/Biniam_Girmay%2C_Grand_Prix_Cycliste_de_Qu%C3%A9bec_2022_%28UCI_WorldTour%29_%28cropped%29.jpg/500px-Biniam_Girmay%2C_Grand_Prix_Cycliste_de_Qu%C3%A9bec_2022_%28UCI_WorldTour%29_%28cropped%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Lëa-Kim Châteauneuf",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Biniam_Girmay,_Grand_Prix_Cycliste_de_Qu%C3%A9bec_2022_(UCI_WorldTour)_(cropped).jpg",
      "sourceTitle": "Biniam Girmay, Grand Prix Cycliste de Québec 2022 (UCI WorldTour) (cropped).jpg"
    }
  },
  "route-giro": {
    "slug": "Tour_d'Italie",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1f/Giro_D_Italia_%28157670051%29.jpeg/500px-Giro_D_Italia_%28157670051%29.jpeg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Jaap Joris Vens",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Giro_D_Italia_(157670051).jpeg",
      "sourceTitle": "Giro D Italia (157670051).jpeg"
    }
  },
  "route-gpdenain": {
    "slug": "Grand_Prix_de_Denain",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ec/Denain_-_Passage_du_Grand_Prix_de_Denain_le_11_avril_2013_%28257%29.JPG/500px-Denain_-_Passage_du_Grand_Prix_de_Denain_le_11_avril_2013_%28257%29.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Jérémy-Günther-Heinz Jähnick",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Denain_-_Passage_du_Grand_Prix_de_Denain_le_11_avril_2013_(257).JPG",
      "sourceTitle": "Denain - Passage du Grand Prix de Denain le 11 avril 2013 (257).JPG"
    }
  },
  "route-grace-brown": {
    "slug": "Grace_Brown",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/eb/Ashleigh_MOOLMAN_and_Grace_BROWN.jpg/500px-Ashleigh_MOOLMAN_and_Grace_BROWN.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Shougissime",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Ashleigh_MOOLMAN_and_Grace_BROWN.jpg",
      "sourceTitle": "Ashleigh MOOLMAN and Grace BROWN.jpg"
    }
  },
  "route-hinault": {
    "slug": "Bernard_Hinault",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e7/Profronde_van_Tiel_Bernard_Hinault_wordt_begroet_door_rondemiss_Vanessa%2C_Bestanddeelnr_932-2817.jpg/500px-Profronde_van_Tiel_Bernard_Hinault_wordt_begroet_door_rondemiss_Vanessa%2C_Bestanddeelnr_932-2817.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Marcel Antonisse / Anefo",
      "licenseShortName": "CC0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Profronde_van_Tiel_Bernard_Hinault_wordt_begroet_door_rondemiss_Vanessa,_Bestanddeelnr_932-2817.jpg",
      "sourceTitle": "Profronde van Tiel Bernard Hinault wordt begroet door rondemiss Vanessa, Bestanddeelnr 932-2817.jpg"
    }
  },
  "route-indurain": {
    "slug": "Miguel_Indurain",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/99/Miguel_INDURAIN.jpg/500px-Miguel_INDURAIN.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Eric HOUDAS",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Miguel_INDURAIN.jpg",
      "sourceTitle": "Miguel INDURAIN.jpg"
    }
  },
  "route-kelly": {
    "slug": "Sean_Kelly_(cyclisme)",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/42/Sean_Kelly%2C_Tour_de_France_2009.jpg/500px-Sean_Kelly%2C_Tour_de_France_2009.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Pierre Diéterlé ( Jean de Gribaldy.com )",
      "licenseShortName": "CC0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Sean_Kelly,_Tour_de_France_2009.jpg",
      "sourceTitle": "Sean Kelly, Tour de France 2009.jpg"
    }
  },
  "route-koppenberg-route": {
    "slug": "Vieux_Quaremont",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/e/e6/Vieux_Quaremont_1.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
    "attribution": {
      "author": "John.john.59",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Vieux_Quaremont_1.jpg",
      "sourceTitle": "Vieux Quaremont 1.jpg"
    }
  },
  "route-kuurne": {
    "slug": "Kuurne-Bruxelles-Kuurne",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7c/Kuurne_-_Kuurne-Brussel-Kuurne%2C_1_maart_2015_%28D09%29.JPG/500px-Kuurne_-_Kuurne-Brussel-Kuurne%2C_1_maart_2015_%28D09%29.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Jérémy-Günther-Heinz Jähnick",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Kuurne_-_Kuurne-Brussel-Kuurne,_1_maart_2015_(D09).JPG",
      "sourceTitle": "Kuurne - Kuurne-Brussel-Kuurne, 1 maart 2015 (D09).JPG"
    }
  },
  "route-lanterne-rouge": {
    "slug": "Lanterne_rouge_(cyclisme)",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e4/Tour_of_Britain_peloton_leaving_Glasgow_Road%2C_Strathaven_-_geograph.org.uk_-_228170.jpg/500px-Tour_of_Britain_peloton_leaving_Glasgow_Road%2C_Strathaven_-_geograph.org.uk_-_228170.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Gordon Brown",
      "licenseShortName": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Tour_of_Britain_peloton_leaving_Glasgow_Road,_Strathaven_-_geograph.org.uk_-_228170.jpg",
      "sourceTitle": "Tour of Britain peloton leaving Glasgow Road, Strathaven - geograph.org.uk - 228170.jpg"
    }
  },
  "route-laporte": {
    "slug": "Christophe_Laporte",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ef/Christophe_Laporte_Paris-Roubaix_2022.jpg/500px-Christophe_Laporte_Paris-Roubaix_2022.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Clémence LN",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Christophe_Laporte_Paris-Roubaix_2022.jpg",
      "sourceTitle": "Christophe Laporte Paris-Roubaix 2022.jpg"
    }
  },
  "route-lbl": {
    "slug": "Liège-Bastogne-Liège",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/31/Liege-Bastogne-Liege_2012.png/500px-Liege-Bastogne-Liege_2012.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Maxxl2",
      "licenseShortName": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Liege-Bastogne-Liege_2012.png",
      "sourceTitle": "Liege-Bastogne-Liege 2012.png"
    }
  },
  "route-lemond": {
    "slug": "Greg_LeMond",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/16/Greg_Lemond_%2815422478828%29_%28cropped%29.jpg/500px-Greg_Lemond_%2815422478828%29_%28cropped%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Brian Townsley",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Greg_Lemond_(15422478828)_(cropped).jpg",
      "sourceTitle": "Greg Lemond (15422478828) (cropped).jpg"
    }
  },
  "route-lombardie": {
    "slug": "Tour_de_Lombardie",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/25/Moreno_Argentin_-_Giro_di_Lombardia_1987.jpg/500px-Moreno_Argentin_-_Giro_di_Lombardia_1987.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Roberto Bettini",
      "licenseShortName": "Public domain",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Moreno_Argentin_-_Giro_di_Lombardia_1987.jpg",
      "sourceTitle": "Moreno Argentin - Giro di Lombardia 1987.jpg"
    }
  },
  "route-madouas": {
    "slug": "Valentin_Madouas",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/89/Valentin_Madouas_%282016-04-09%29_-_Oudenaarde_-_Ronde_van_Vlaanderen_Beloften.jpg/500px-Valentin_Madouas_%282016-04-09%29_-_Oudenaarde_-_Ronde_van_Vlaanderen_Beloften.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Jérémy-Günther-Heinz Jähnick",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Valentin_Madouas_(2016-04-09)_-_Oudenaarde_-_Ronde_van_Vlaanderen_Beloften.jpg",
      "sourceTitle": "Valentin Madouas (2016-04-09) - Oudenaarde - Ronde van Vlaanderen Beloften.jpg"
    }
  },
  "route-martinez": {
    "slug": "Lenny_Martinez",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/ba/Victoire_de_Lenny_Martinez_au_CIC-Mont_Ventoux_2023.jpg/500px-Victoire_de_Lenny_Martinez_au_CIC-Mont_Ventoux_2023.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "William Çannarella",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Victoire_de_Lenny_Martinez_au_CIC-Mont_Ventoux_2023.jpg",
      "sourceTitle": "Victoire de Lenny Martinez au CIC-Mont Ventoux 2023.jpg"
    }
  },
  "route-merckx": {
    "slug": "Eddy_Merckx",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/a/aa/Eddy_Merckx_Molteni_2.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
    "attribution": {
      "author": "Nationaal Archief",
      "licenseShortName": "No restrictions",
      "licenseUrl": "https://www.flickr.com/commons/usage/",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Eddy_Merckx_Molteni_2.jpg",
      "sourceTitle": "Eddy Merckx Molteni 2.jpg"
    }
  },
  "route-milansanremo": {
    "slug": "Milan-San_Remo",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a7/Milano_Sanremo_1961_-_Punzonatura.jpg/500px-Milano_Sanremo_1961_-_Punzonatura.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Mario Germoglio",
      "licenseShortName": "Public domain",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Milano_Sanremo_1961_-_Punzonatura.jpg",
      "sourceTitle": "Milano Sanremo 1961 - Punzonatura.jpg"
    }
  },
  "route-mondiaux": {
    "slug": "Championnats_du_monde_de_cyclisme_sur_route",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/14/20180929_UCI_Road_World_Championships_Innsbruck_Women_Elite_Road_Race_850_1119.jpg/500px-20180929_UCI_Road_World_Championships_Innsbruck_Women_Elite_Road_Race_850_1119.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Granada",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:20180929_UCI_Road_World_Championships_Innsbruck_Women_Elite_Road_Race_850_1119.jpg",
      "sourceTitle": "20180929 UCI Road World Championships Innsbruck Women Elite Road Race 850 1119.jpg"
    }
  },
  "route-mortirolo": {
    "slug": "Col_du_Mortirolo",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/10/Passo_del_Mortirolo.JPG/500px-Passo_del_Mortirolo.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Gabri80",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Passo_del_Mortirolo.JPG",
      "sourceTitle": "Passo del Mortirolo.JPG"
    }
  },
  "route-mur-huy": {
    "slug": "Mur_de_Huy",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4c/2017_Mur_de_Huy_3.jpg/500px-2017_Mur_de_Huy_3.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Hoebele",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2017_Mur_de_Huy_3.jpg",
      "sourceTitle": "2017 Mur de Huy 3.jpg"
    }
  },
  "route-musette": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f1/Tour_de_France%2C_peloton_-_geograph.org.uk_-_4624719.jpg/500px-Tour_de_France%2C_peloton_-_geograph.org.uk_-_4624719.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Stephen Craven",
      "licenseShortName": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Tour_de_France,_peloton_-_geograph.org.uk_-_4624719.jpg",
      "sourceTitle": "Tour de France, peloton - geograph.org.uk - 4624719.jpg"
    }
  },
  "route-muzic": {
    "slug": "Évita_Muzic",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/44/%C3%89vita_Muzic_-_Pr%C3%A9sentation_TCFIA_2025.jpg/500px-%C3%89vita_Muzic_-_Pr%C3%A9sentation_TCFIA_2025.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Kakoula10",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:%C3%89vita_Muzic_-_Pr%C3%A9sentation_TCFIA_2025.jpg",
      "sourceTitle": "Évita Muzic - Présentation TCFIA 2025.jpg"
    }
  },
  "route-niewiadoma": {
    "slug": "Kasia_Niewiadoma",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f2/Katarzyna_Niewiadoma_-_2025_European_road_championship_podium_-_Guilherand-Granges.jpg/500px-Katarzyna_Niewiadoma_-_2025_European_road_championship_podium_-_Guilherand-Granges.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Kakoula10",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Katarzyna_Niewiadoma_-_2025_European_road_championship_podium_-_Guilherand-Granges.jpg",
      "sourceTitle": "Katarzyna Niewiadoma - 2025 European road championship podium - Guilherand-Granges.jpg"
    }
  },
  "route-pantani": {
    "slug": "Marco_Pantani",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0f/Marco_Pantani.jpg/500px-Marco_Pantani.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Aldo Bolzan Scan Les Meloures at lb.wikipedia",
      "licenseShortName": "CC BY-SA 3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Marco_Pantani.jpg",
      "sourceTitle": "Marco Pantani.jpg"
    }
  },
  "route-patin-braquet": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/12/Wereldkampioenschappen_wielrennen_te_Ronse_Amateurs_Gerben_Karstens_won_sprint%2C_Bestanddeelnr_915-4172.jpg/500px-Wereldkampioenschappen_wielrennen_te_Ronse_Amateurs_Gerben_Karstens_won_sprint%2C_Bestanddeelnr_915-4172.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Eric Koch for Anefo",
      "licenseShortName": "CC0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Wereldkampioenschappen_wielrennen_te_Ronse_Amateurs_Gerben_Karstens_won_sprint,_Bestanddeelnr_915-4172.jpg",
      "sourceTitle": "Wereldkampioenschappen wielrennen te Ronse Amateurs Gerben Karstens won sprint, Bestanddeelnr 915-4172.jpg"
    }
  },
  "route-pedersen": {
    "slug": "Mads_Pedersen",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/af/Mads_Pedersen_%282025-05-14%29.jpeg/500px-Mads_Pedersen_%282025-05-14%29.jpeg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Mfran22",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Mads_Pedersen_(2025-05-14).jpeg",
      "sourceTitle": "Mads Pedersen (2025-05-14).jpeg"
    }
  },
  "route-philipsen": {
    "slug": "Jasper_Philipsen",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bb/Jasper_Philipsen_2023_%28cropped%29.jpg/500px-Jasper_Philipsen_2023_%28cropped%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Joost Pauwels",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Jasper_Philipsen_2023_(cropped).jpg",
      "sourceTitle": "Jasper Philipsen 2023 (cropped).jpg"
    }
  },
  "route-pinot": {
    "slug": "Thibaut_Pinot",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f9/Tour_du_Doubs_2014_-_Pontarlier_-_Thibaut_Pinot.jpg/500px-Tour_du_Doubs_2014_-_Pontarlier_-_Thibaut_Pinot.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Benoît Prieur",
      "licenseShortName": "CC0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Tour_du_Doubs_2014_-_Pontarlier_-_Thibaut_Pinot.jpg",
      "sourceTitle": "Tour du Doubs 2014 - Pontarlier - Thibaut Pinot.jpg"
    }
  },
  "route-pogacar": {
    "slug": "Tadej_Pogačar",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a9/2022_Tour_of_Slovenia_%28Stage_3%2C_Tadej_Poga%C4%8Dar_celebrating_victory_on_Celje_Castle_v2%29.jpg/500px-2022_Tour_of_Slovenia_%28Stage_3%2C_Tadej_Poga%C4%8Dar_celebrating_victory_on_Celje_Castle_v2%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Petar Milošević",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2022_Tour_of_Slovenia_(Stage_3,_Tadej_Poga%C4%8Dar_celebrating_victory_on_Celje_Castle_v2).jpg",
      "sourceTitle": "2022 Tour of Slovenia (Stage 3, Tadej Pogačar celebrating victory on Celje Castle v2).jpg"
    }
  },
  "route-poulidor": {
    "slug": "Raymond_Poulidor",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/7/79/Raymond_Poulidor_en_1968.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
    "attribution": {
      "author": "Panini",
      "licenseShortName": "Public domain",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Raymond_Poulidor_en_1968.jpg",
      "sourceTitle": "Raymond Poulidor en 1968.jpg"
    }
  },
  "route-relais-echappee": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e8/P_is_for_Peloton_-_E_X_P_L_O_R_E_D_-_Flickr_-_Clint_Budd.jpg/500px-P_is_for_Peloton_-_E_X_P_L_O_R_E_D_-_Flickr_-_Clint_Budd.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Clint Budd from About 15 miles North of Swansea, Wales",
      "licenseShortName": "CC BY 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:P_is_for_Peloton_-_E_X_P_L_O_R_E_D_-_Flickr_-_Clint_Budd.jpg",
      "sourceTitle": "P is for Peloton - E X P L O R E D - Flickr - Clint Budd.jpg"
    }
  },
  "route-roglic": {
    "slug": "Primož_Roglič",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c9/Sprejem_v_%C4%8Dast_slovenskim_in_francoskim_kolesarjem_ob_zaklju%C4%8Dku_Dirke_po_Franciji_-_54683392137_%28cropped%29.jpg/500px-Sprejem_v_%C4%8Dast_slovenskim_in_francoskim_kolesarjem_ob_zaklju%C4%8Dku_Dirke_po_Franciji_-_54683392137_%28cropped%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Žan Kolman",
      "licenseShortName": "Public domain",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Sprejem_v_%C4%8Dast_slovenskim_in_francoskim_kolesarjem_ob_zaklju%C4%8Dku_Dirke_po_Franciji_-_54683392137_(cropped).jpg",
      "sourceTitle": "Sprejem v čast slovenskim in francoskim kolesarjem ob zaključku Dirke po Franciji - 54683392137 (cropped).jpg"
    }
  },
  "route-ronde": {
    "slug": "Tour_des_Flandres",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c5/Ronde_Van_Vlaanderen_2018_Tour_of_Flanders_2018_%2840281669425%29.jpg/500px-Ronde_Van_Vlaanderen_2018_Tour_of_Flanders_2018_%2840281669425%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "s.yuki",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Ronde_Van_Vlaanderen_2018_Tour_of_Flanders_2018_(40281669425).jpg",
      "sourceTitle": "Ronde Van Vlaanderen 2018 Tour of Flanders 2018 (40281669425).jpg"
    }
  },
  "route-roubaix": {
    "slug": "Paris-Roubaix",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d5/2012_Paris-Roubaix%2C_Peloton_on_Cobbles_%287057784375%29.jpg/500px-2012_Paris-Roubaix%2C_Peloton_on_Cobbles_%287057784375%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Roxanne King",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2012_Paris-Roubaix,_Peloton_on_Cobbles_(7057784375).jpg",
      "sourceTitle": "2012 Paris-Roubaix, Peloton on Cobbles (7057784375).jpg"
    }
  },
  "route-roue-lenti": {
    "slug": "Vélo_de_contre-la-montre",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/14/20180924_UCI_Road_World_Championships_Innsbruck_Men_U23_ITT_Callum_Scotson_850_8281.jpg/500px-20180924_UCI_Road_World_Championships_Innsbruck_Men_U23_ITT_Callum_Scotson_850_8281.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Granada",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:20180924_UCI_Road_World_Championships_Innsbruck_Men_U23_ITT_Callum_Scotson_850_8281.jpg",
      "sourceTitle": "20180924 UCI Road World Championships Innsbruck Men U23 ITT Callum Scotson 850 8281.jpg"
    }
  },
  "route-seixas": {
    "slug": "Paul_Seixas",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5a/Paul_Seixas_-_podium_medaille_bronze_-_2025_European_road_championship.jpg/500px-Paul_Seixas_-_podium_medaille_bronze_-_2025_European_road_championship.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Kakoula10",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Paul_Seixas_-_podium_medaille_bronze_-_2025_European_road_championship.jpg",
      "sourceTitle": "Paul Seixas - podium medaille bronze - 2025 European road championship.jpg"
    }
  },
  "route-stelvio": {
    "slug": "Col_du_Stelvio",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/13/Stelvio.jpg/500px-Stelvio.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Marco Mayer, Germany",
      "licenseShortName": "CC BY-SA 3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Stelvio.jpg",
      "sourceTitle": "Stelvio.jpg"
    }
  },
  "route-tdf": {
    "slug": "Tour_de_France",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d6/Tadej_Pogacar_and_his_team_in_front_of_the_peloton_during_Simacourbe_climb_of_Tour_de_France_2024_stage_13.jpg/500px-Tadej_Pogacar_and_his_team_in_front_of_the_peloton_during_Simacourbe_climb_of_Tour_de_France_2024_stage_13.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Hugo LUC",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Tadej_Pogacar_and_his_team_in_front_of_the_peloton_during_Simacourbe_climb_of_Tour_de_France_2024_stage_13.jpg",
      "sourceTitle": "Tadej Pogacar and his team in front of the peloton during Simacourbe climb of Tour de France 2024 stage 13.jpg"
    }
  },
  "route-tdf-femmes": {
    "slug": "Tour_de_France_Femmes",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/27/Gele_Trui_Van_De_Vijver_1993_-_frontaal.jpg/500px-Gele_Trui_Van_De_Vijver_1993_-_frontaal.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Castelli Cycling",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Gele_Trui_Van_De_Vijver_1993_-_frontaal.jpg",
      "sourceTitle": "Gele Trui Van De Vijver 1993 - frontaal.jpg"
    }
  },
  "route-tourmalet": {
    "slug": "Col_du_Tourmalet",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/01/Le_col_du_Tourmalet_r%C3%A9am%C3%A9n%C3%A9g%C3%A9_en_2023.jpg/500px-Le_col_du_Tourmalet_r%C3%A9am%C3%A9n%C3%A9g%C3%A9_en_2023.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Serge Ottaviani",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Le_col_du_Tourmalet_r%C3%A9am%C3%A9n%C3%A9g%C3%A9_en_2023.jpg",
      "sourceTitle": "Le col du Tourmalet réaménégé en 2023.jpg"
    }
  },
  "route-train-sprint": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/21/London_2012_Women_Road_Race.jpg/500px-London_2012_Women_Road_Race.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Peter Trimming from Croydon, England",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:London_2012_Women_Road_Race.jpg",
      "sourceTitle": "London 2012 Women Road Race.jpg"
    }
  },
  "route-trobroleon": {
    "slug": "Tro_Bro_Leon",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f4/Franck_Perque_Tro_Bro_Leon_2002.jpg/500px-Franck_Perque_Tro_Bro_Leon_2002.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "FRANCKPERQUE",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Franck_Perque_Tro_Bro_Leon_2002.jpg",
      "sourceTitle": "Franck Perque Tro Bro Leon 2002.jpg"
    }
  },
  "route-valverde": {
    "slug": "Alejandro_Valverde",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1b/20180930_UCI_Road_World_Championships_Innsbruck_Men_Elite_Road_Race_Alejandro_Valverde_850_2213.jpg/500px-20180930_UCI_Road_World_Championships_Innsbruck_Men_Elite_Road_Race_Alejandro_Valverde_850_2213.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Granada",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:20180930_UCI_Road_World_Championships_Innsbruck_Men_Elite_Road_Race_Alejandro_Valverde_850_2213.jpg",
      "sourceTitle": "20180930 UCI Road World Championships Innsbruck Men Elite Road Race Alejandro Valverde 850 2213.jpg"
    }
  },
  "route-vanvleuten": {
    "slug": "Annemiek_van_Vleuten",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1f/Annemiek_van_Vleuten_%282023%29.jpg/500px-Annemiek_van_Vleuten_%282023%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Joost Pauwels",
      "licenseShortName": "CC0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Annemiek_van_Vleuten_(2023).jpg",
      "sourceTitle": "Annemiek van Vleuten (2023).jpg"
    }
  },
  "route-ventoux": {
    "slug": "Mont_Ventoux",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/86/Mont_ventoux_from_mirabel.jpg/500px-Mont_ventoux_from_mirabel.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "User:Midgrid (formerly known as Diniz)",
      "licenseShortName": "Public domain",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Mont_ventoux_from_mirabel.jpg",
      "sourceTitle": "Mont ventoux from mirabel.jpg"
    }
  },
  "route-vingegaard": {
    "slug": "Jonas_Vingegaard",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2f/Jonas_Vingegaard_-_Vainqueur_du_Tour_de_France_2023.jpg/500px-Jonas_Vingegaard_-_Vainqueur_du_Tour_de_France_2023.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "René Hourdry",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Jonas_Vingegaard_-_Vainqueur_du_Tour_de_France_2023.jpg",
      "sourceTitle": "Jonas Vingegaard - Vainqueur du Tour de France 2023.jpg"
    }
  },
  "route-voiture-balai": {
    "slug": "Voiture-balai",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3e/VW_Crafter_Voiture_balai_Tour_de_France_2017_Nuits-Saint-Georges_%2838604172584%29.jpg/500px-VW_Crafter_Voiture_balai_Tour_de_France_2017_Nuits-Saint-Georges_%2838604172584%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Guillaume Vachey",
      "licenseShortName": "CC0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:VW_Crafter_Voiture_balai_Tour_de_France_2017_Nuits-Saint-Georges_(38604172584).jpg",
      "sourceTitle": "VW Crafter Voiture balai Tour de France 2017 Nuits-Saint-Georges (38604172584).jpg"
    }
  },
  "route-vollering": {
    "slug": "Demi_Vollering",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/45/Demi_Vollering_-_2025_European_road_championship_podium_-_Guilherand-Granges.jpg/500px-Demi_Vollering_-_2025_European_road_championship_podium_-_Guilherand-Granges.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Kakoula10",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Demi_Vollering_-_2025_European_road_championship_podium_-_Guilherand-Granges.jpg",
      "sourceTitle": "Demi Vollering - 2025 European road championship podium - Guilherand-Granges.jpg"
    }
  },
  "route-wiebes": {
    "slug": "Lorena_Wiebes",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/eb/2025_ToBW_Stage_4_001_Lorena_Wiebes.JPG/500px-2025_ToBW_Stage_4_001_Lorena_Wiebes.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Geof Sheppard",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2025_ToBW_Stage_4_001_Lorena_Wiebes.JPG",
      "sourceTitle": "2025 ToBW Stage 4 001 Lorena Wiebes.JPG"
    }
  },
  "vtt-absalon": {
    "slug": "Julien_Absalon",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d5/Julien_Absalon_2013_%28cropped%29.JPG/500px-Julien_Absalon_2013_%28cropped%29.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Christophe95",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Julien_Absalon_2013_(cropped).JPG",
      "sourceTitle": "Julien Absalon 2013 (cropped).JPG"
    }
  },
  "vtt-appuis-relev": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/59/MTB_berm.jpg/500px-MTB_berm.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Spybeak",
      "licenseShortName": "CC0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:MTB_berm.jpg",
      "sourceTitle": "MTB berm.jpg"
    }
  },
  "vtt-atherton": {
    "slug": "Rachel_Atherton",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ac/RachelAhterton.jpg/500px-RachelAhterton.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Courtney Nash",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:RachelAhterton.jpg",
      "sourceTitle": "RachelAhterton.jpg"
    }
  },
  "vtt-beatrice-msa": {
    "slug": "Mont-Sainte-Anne",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/df/2010_UCI_Mountain_Bike_and_Trials_World_Championships_-_Mont-Sainte-Anne_-_trials.jpg/500px-2010_UCI_Mountain_Bike_and_Trials_World_Championships_-_Mont-Sainte-Anne_-_trials.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Nsheard",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2010_UCI_Mountain_Bike_and_Trials_World_Championships_-_Mont-Sainte-Anne_-_trials.jpg",
      "sourceTitle": "2010 UCI Mountain Bike and Trials World Championships - Mont-Sainte-Anne - trials.jpg"
    }
  },
  "vtt-bresset": {
    "slug": "Julie_Bresset",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/Julie_Bresset-Super-Besse-2012.jpg/500px-Julie_Bresset-Super-Besse-2012.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Sylenius",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Julie_Bresset-Super-Besse-2012.jpg",
      "sourceTitle": "Julie Bresset-Super-Besse-2012.jpg"
    }
  },
  "vtt-bruni": {
    "slug": "Loïc_Bruni",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/91/Loic_Bruni_2015_%28cropped%29.jpg/500px-Loic_Bruni_2015_%28cropped%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Downhill911",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Loic_Bruni_2015_(cropped).jpg",
      "sourceTitle": "Loic Bruni 2015 (cropped).jpg"
    }
  },
  "vtt-bunnyhop": {
    "slug": "Bunny_hop",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fe/DownhillJump.jpg/500px-DownhillJump.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Oyvind1979 at English Wikipedia",
      "licenseShortName": "Public domain",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:DownhillJump.jpg",
      "sourceTitle": "DownhillJump.jpg"
    }
  },
  "vtt-cape-epic": {
    "slug": "Cape_Epic",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3f/Cape_epic_stage_5.jpg/500px-Cape_epic_stage_5.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "jason sager",
      "licenseShortName": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Cape_epic_stage_5.jpg",
      "sourceTitle": "Cape epic stage 5.jpg"
    }
  },
  "vtt-champery-wall": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/56/2011_UCI_Mountain_Bike_and_Trials_World_Championships_-_19.JPG/500px-2011_UCI_Mountain_Bike_and_Trials_World_Championships_-_19.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Shev123",
      "licenseShortName": "CC0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2011_UCI_Mountain_Bike_and_Trials_World_Championships_-_19.JPG",
      "sourceTitle": "2011 UCI Mountain Bike and Trials World Championships - 19.JPG"
    }
  },
  "vtt-chausson": {
    "slug": "Anne-Caroline_Chausson",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/4/46/Anne_Caroline_Chausson.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
    "attribution": {
      "author": "Robin Chausson",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Anne_Caroline_Chausson.png",
      "sourceTitle": "Anne Caroline Chausson.png"
    }
  },
  "vtt-check-ligne": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/53/Downhill_Mountain_Bike_Course%2C_Holywell_Dene_-_geograph.org.uk_-_6435744.jpg/500px-Downhill_Mountain_Bike_Course%2C_Holywell_Dene_-_geograph.org.uk_-_6435744.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Geoff Holland",
      "licenseShortName": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Downhill_Mountain_Bike_Course,_Holywell_Dene_-_geograph.org.uk_-_6435744.jpg",
      "sourceTitle": "Downhill Mountain Bike Course, Holywell Dene - geograph.org.uk - 6435744.jpg"
    }
  },
  "vtt-clementz": {
    "slug": "Jérôme_Clementz",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b2/Portrait_Jerome_Clementz.jpg/500px-Portrait_Jerome_Clementz.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Jérémie Reuiller",
      "licenseShortName": "CC0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Portrait_Jerome_Clementz.jpg",
      "sourceTitle": "Portrait Jerome Clementz.jpg"
    }
  },
  "vtt-crankworx": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/03/Whistler_Mountain_Bike_Park_slopestyle_course.jpg/500px-Whistler_Mountain_Bike_Park_slopestyle_course.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Roy and Susan",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Whistler_Mountain_Bike_Park_slopestyle_course.jpg",
      "sourceTitle": "Whistler Mountain Bike Park slopestyle course.jpg"
    }
  },
  "vtt-dahle": {
    "slug": "Gunn-Rita_Dahle_Flesjå",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e8/Gunn-Rita_Dahle_2016.jpg/500px-Gunn-Rita_Dahle_2016.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "youkeys",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Gunn-Rita_Dahle_2016.jpg",
      "sourceTitle": "Gunn-Rita Dahle 2016.jpg"
    }
  },
  "vtt-daudet": {
    "slug": "Joris_Daudet",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/96/Joris_Daudet_-_Rio_2016.jpg/500px-Joris_Daudet_-_Rio_2016.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Agência Brasil Fotografias",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Joris_Daudet_-_Rio_2016.jpg",
      "sourceTitle": "Joris Daudet - Rio 2016.jpg"
    }
  },
  "vtt-dh-mullet": {
    "slug": "",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/7/71/%E9%AB%98%E5%B1%B1_%E8%BC%9D_%28%E3%81%9F%E3%81%8B%E3%82%84%E3%81%BE_%E3%81%B2%E3%81%8B%E3%82%8B%29--MOWNTAIN_BIKE_DOWNHILL_RIDER----1998%E5%B9%B47%E6%9C%8815%E6%97%A5%E8%AA%95%E7%94%9F----%E5%9F%BC%E7%8E%89%E3%81%AEPro_Bicycle_Shop_AST_%E3%81%AE%E4%B8%89%E7%94%B7%E3%81%A8%E3%81%97%E3%81%A6%E7%94%9F%E3%81%BE%E3%82%8C%E3%82%8B%E3%80%82----%E6%9C%80%E5%88%9D%E3%81%AE%E9%A0%83%E3%81%AF%E3%80%81BMX%E3%83%AC%E3%83%BC%E3%82%B9%28JOSF%29%E3%82%92%E4%B8%AD%E5%BF%83%E3%81%AB%E3%83%AC%E3%83%BC%E3%82%B9_2013-06-07_23-16.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
    "attribution": {
      "author": "User:Bullnocoes",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:%E9%AB%98%E5%B1%B1_%E8%BC%9D_(%E3%81%9F%E3%81%8B%E3%82%84%E3%81%BE_%E3%81%B2%E3%81%8B%E3%82%8B)--MOWNTAIN_BIKE_DOWNHILL_RIDER----1998%E5%B9%B47%E6%9C%8815%E6%97%A5%E8%AA%95%E7%94%9F----%E5%9F%BC%E7%8E%89%E3%81%AEPro_Bicycle_Shop_AST_%E3%81%AE%E4%B8%89%E7%94%B7%E3%81%A8%E3%81%97%E3%81%A6%E7%94%9F%E3%81%BE%E3%82%8C%E3%82%8B%E3%80%82----%E6%9C%80%E5%88%9D%E3%81%AE%E9%A0%83%E3%81%AF%E3%80%81BMX%E3%83%AC%E3%83%BC%E3%82%B9(JOSF)%E3%82%92%E4%B8%AD%E5%BF%83%E3%81%AB%E3%83%AC%E3%83%BC%E3%82%B9_2013-06-07_23-16.jpg",
      "sourceTitle": "高山 輝 (たかやま ひかる)--MOWNTAIN BIKE DOWNHILL RIDER----1998年7月15日誕生----埼玉のPro Bicycle Shop AST の三男として生まれる。----最初の頃は、BMXレース(JOS"
    }
  },
  "vtt-dropper": {
    "slug": "Tige_de_selle",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/85/TigedeSelle.JPG/500px-TigedeSelle.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Raminagrobis",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:TigedeSelle.JPG",
      "sourceTitle": "TigedeSelle.JPG"
    }
  },
  "vtt-fort-william": {
    "slug": "Fort_William_(Écosse)",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7f/Fort_William_World_Cup_DH_2009-_Sunday_Practice._Sabrina_Jonnier.jpg/500px-Fort_William_World_Cup_DH_2009-_Sunday_Practice._Sabrina_Jonnier.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Douglas Cook",
      "licenseShortName": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Fort_William_World_Cup_DH_2009-_Sunday_Practice._Sabrina_Jonnier.jpg",
      "sourceTitle": "Fort William World Cup DH 2009- Sunday Practice. Sabrina Jonnier.jpg"
    }
  },
  "vtt-freins-4p": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a4/Magura_Julie_disk_brake_rotor_160_mm.jpg/500px-Magura_Julie_disk_brake_rotor_160_mm.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Petar Milošević",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Magura_Julie_disk_brake_rotor_160_mm.jpg",
      "sourceTitle": "Magura Julie disk brake rotor 160 mm.jpg"
    }
  },
  "vtt-goldstone": {
    "slug": "Jackson_Goldstone",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ee/Jackson_goldstone_snowshoe_2022.jpg/500px-Jackson_goldstone_snowshoe_2022.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Stephen LaBonte",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Jackson_goldstone_snowshoe_2022.jpg",
      "sourceTitle": "Jackson goldstone snowshoe 2022.jpg"
    }
  },
  "vtt-hart": {
    "slug": "Danny_Hart",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e5/Danny_Hart_cyclist.jpg/500px-Danny_Hart_cyclist.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Todd Hellinga",
      "licenseShortName": "Public domain",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Danny_Hart_cyclist.jpg",
      "sourceTitle": "Danny Hart cyclist.jpg"
    }
  },
  "vtt-hatherly": {
    "slug": "Alan_Hatherly",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1a/Alan_Hatherly_%28RSA%29_2024.jpg/500px-Alan_Hatherly_%28RSA%29_2024.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Stephen LaBonte",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Alan_Hatherly_(RSA)_2024.jpg",
      "sourceTitle": "Alan Hatherly (RSA) 2024.jpg"
    }
  },
  "vtt-hill": {
    "slug": "Sam_Hill_(cycliste)",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2c/Sam_Hill_Sea_Otter_2009_Dual_Slalom_Winner.JPG/500px-Sam_Hill_Sea_Otter_2009_Dual_Slalom_Winner.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Thomas.fanghaenel",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Sam_Hill_Sea_Otter_2009_Dual_Slalom_Winner.JPG",
      "sourceTitle": "Sam Hill Sea Otter 2009 Dual Slalom Winner.JPG"
    }
  },
  "vtt-holl": {
    "slug": "Valentina_Höll",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8f/Valentina_H%C3%B6ll_at_the_start_of_UCI_MTB_world_cup_in_Loudenvielle_2025.jpg/500px-Valentina_H%C3%B6ll_at_the_start_of_UCI_MTB_world_cup_in_Loudenvielle_2025.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Hugo LUC",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Valentina_H%C3%B6ll_at_the_start_of_UCI_MTB_world_cup_in_Loudenvielle_2025.jpg",
      "sourceTitle": "Valentina Höll at the start of UCI MTB world cup in Loudenvielle 2025.jpg"
    }
  },
  "vtt-jeune-enduro": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5a/Carson-Galbreath.png/500px-Carson-Galbreath.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Cgalbreath",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Carson-Galbreath.png",
      "sourceTitle": "Carson-Galbreath.png"
    }
  },
  "vtt-kit-co2": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a7/Puncture-repaire-kit.jpg/500px-Puncture-repaire-kit.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Björn Appel",
      "licenseShortName": "CC BY-SA 3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Puncture-repaire-kit.jpg",
      "sourceTitle": "Puncture-repaire-kit.jpg"
    }
  },
  "vtt-koretzky": {
    "slug": "Victor_Koretzky",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ef/Victor_Koretzky_-_Team_KMC_EKOI_ORBEA_-_2019.png/500px-Victor_Koretzky_-_Team_KMC_EKOI_ORBEA_-_2019.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "ClémentKoretzky",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Victor_Koretzky_-_Team_KMC_EKOI_ORBEA_-_2019.png",
      "sourceTitle": "Victor Koretzky - Team KMC EKOI ORBEA - 2019.png"
    }
  },
  "vtt-lecomte": {
    "slug": "Loana_Lecomte",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ca/Loana_Lecomte_%28FRA%29_2019.jpg/500px-Loana_Lecomte_%28FRA%29_2019.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Sumpu",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Loana_Lecomte_(FRA)_2019.jpg",
      "sourceTitle": "Loana Lecomte (FRA) 2019.jpg"
    }
  },
  "vtt-macaskill": {
    "slug": "Danny_MacAskill",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/47/Danny_MacAskill.jpg/500px-Danny_MacAskill.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Steve Hodgson",
      "licenseShortName": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Danny_MacAskill.jpg",
      "sourceTitle": "Danny MacAskill.jpg"
    }
  },
  "vtt-marotte": {
    "slug": "Maxime_Marotte",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/27/2016_MTB_World_Cup_Albstadt_M._Marotte.jpg/500px-2016_MTB_World_Cup_Albstadt_M._Marotte.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "youkeys",
      "licenseShortName": "CC BY 2.5",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.5",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:2016_MTB_World_Cup_Albstadt_M._Marotte.jpg",
      "sourceTitle": "2016 MTB World Cup Albstadt M. Marotte.jpg"
    }
  },
  "vtt-minnaar": {
    "slug": "Greg_Minnaar",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/e/e9/Greg_Minnaar_2012_%28RSA%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
    "attribution": {
      "author": "Downhill911",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Greg_Minnaar_2012_(RSA).jpg",
      "sourceTitle": "Greg Minnaar 2012 (RSA).jpg"
    }
  },
  "vtt-neff": {
    "slug": "Jolanda_Neff",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/eb/12._Internationale_Sportnacht_Davos_2014_%2815244762159%29_%28cropped%29.jpg/500px-12._Internationale_Sportnacht_Davos_2014_%2815244762159%29_%28cropped%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "12. Internationale Sportnacht Davos from Davos, Schweiz",
      "licenseShortName": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:12._Internationale_Sportnacht_Davos_2014_(15244762159)_(cropped).jpg",
      "sourceTitle": "12. Internationale Sportnacht Davos 2014 (15244762159) (cropped).jpg"
    }
  },
  "vtt-nicole": {
    "slug": "Myriam_Nicole",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e6/Myriam_Nicole_at_the_start_of_UCI_MTB_world_cup_in_Loudenvielle_2025.jpg/500px-Myriam_Nicole_at_the_start_of_UCI_MTB_world_cup_in_Loudenvielle_2025.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Hugo LUC",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Myriam_Nicole_at_the_start_of_UCI_MTB_world_cup_in_Loudenvielle_2025.jpg",
      "sourceTitle": "Myriam Nicole at the start of UCI MTB world cup in Loudenvielle 2025.jpg"
    }
  },
  "vtt-nove-mesto": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ed/Brandl_Roth_UCI_Mountain_Bike_World_Cup_Nove_Mesto.jpg/500px-Brandl_Roth_UCI_Mountain_Bike_World_Cup_Nove_Mesto.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Lexware Mountainbike Team",
      "licenseShortName": "CC0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Brandl_Roth_UCI_Mountain_Bike_World_Cup_Nove_Mesto.jpg",
      "sourceTitle": "Brandl Roth UCI Mountain Bike World Cup Nove Mesto.jpg"
    }
  },
  "vtt-pajon": {
    "slug": "Mariana_Pajón",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4e/MarianaPajon.jpg/500px-MarianaPajon.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Seleccionantioquia",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:MarianaPajon.jpg",
      "sourceTitle": "MarianaPajon.jpg"
    }
  },
  "vtt-pedales-plates": {
    "slug": "Pédale_de_bicyclette",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fe/13-01-06-fahrradkram-05.jpg/500px-13-01-06-fahrradkram-05.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Ralf Roletschek ( talk ) - Infos über Fahrräder auf fahrradmonteur.de",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:13-01-06-fahrradkram-05.jpg",
      "sourceTitle": "13-01-06-fahrradkram-05.jpg"
    }
  },
  "vtt-pierron": {
    "slug": "Amaury_Pierron",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/82/Amaury_Pierron_2022_MSA.jpg/500px-Amaury_Pierron_2022_MSA.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Stephen LaBonte",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Amaury_Pierron_2022_MSA.jpg",
      "sourceTitle": "Amaury Pierron 2022 MSA.jpg"
    }
  },
  "vtt-pression-fourche": {
    "slug": "Fourche_(vélo)",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5a/Wittson_titanium_cyclocross_disc_bicycle_fork_02.jpg/500px-Wittson_titanium_cyclocross_disc_bicycle_fork_02.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Gintaraszukauskas",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Wittson_titanium_cyclocross_disc_bicycle_fork_02.jpg",
      "sourceTitle": "Wittson titanium cyclocross disc bicycle fork 02.jpg"
    }
  },
  "vtt-pump-track": {
    "slug": "Pump_track",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/df/HeatleyParkTownsville_1.jpg/500px-HeatleyParkTownsville_1.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "ModularPumptrack",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:HeatleyParkTownsville_1.jpg",
      "sourceTitle": "HeatleyParkTownsville 1.jpg"
    }
  },
  "vtt-richards": {
    "slug": "Evie_Richards",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/2/23/Evie_Richards_%28cropped%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
    "attribution": {
      "author": "RAY",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Evie_Richards_(cropped).jpg",
      "sourceTitle": "Evie Richards (cropped).jpg"
    }
  },
  "vtt-roc-azur": {
    "slug": "Roc_d'Azur",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/0/0e/RocDAzur.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
    "attribution": {
      "author": "Contributeur Wikimedia Commons",
      "licenseShortName": "CC BY-SA 2.5",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.5",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:RocDAzur.JPG",
      "sourceTitle": "RocDAzur.JPG"
    }
  },
  "vtt-sarrou": {
    "slug": "Jordan_Sarrou",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2e/Jordan_Sarrou_%28FRA%29_2016.jpg/500px-Jordan_Sarrou_%28FRA%29_2016.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "youkeys",
      "licenseShortName": "CC BY 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Jordan_Sarrou_(FRA)_2016.jpg",
      "sourceTitle": "Jordan Sarrou (FRA) 2016.jpg"
    }
  },
  "vtt-schurter": {
    "slug": "Nino_Schurter",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d6/12._Internationale_Sportnacht_Davos_2014_%2815244829340%29.jpg/500px-12._Internationale_Sportnacht_Davos_2014_%2815244829340%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "12. Internationale Sportnacht Davos from Davos, Schweiz",
      "licenseShortName": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:12._Internationale_Sportnacht_Davos_2014_(15244829340).jpg",
      "sourceTitle": "12. Internationale Sportnacht Davos 2014 (15244829340).jpg"
    }
  },
  "vtt-scrub-whip": {
    "slug": "",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6c/A_downhill_mountain_biker_from_Arak.jpg/500px-A_downhill_mountain_biker_from_Arak.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Omid Jafarnezhad",
      "licenseShortName": "CC BY 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:A_downhill_mountain_biker_from_Arak.jpg",
      "sourceTitle": "A downhill mountain biker from Arak.jpg"
    }
  },
  "vtt-semi-rigide": {
    "slug": "Vélo_tout-terrain",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2b/The_Meridia_Mountain_Bike_Cross_Country_Race_-_geograph.org.uk_-_796196.jpg/500px-The_Meridia_Mountain_Bike_Cross_Country_Race_-_geograph.org.uk_-_796196.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Iain Lees",
      "licenseShortName": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:The_Meridia_Mountain_Bike_Cross_Country_Race_-_geograph.org.uk_-_796196.jpg",
      "sourceTitle": "The Meridia Mountain Bike Cross Country Race - geograph.org.uk - 796196.jpg"
    }
  },
  "vtt-singletrack-pin": {
    "slug": "",
    "thumbnailUrl": "https://upload.wikimedia.org/wikipedia/commons/5/54/Singletrack%2C_Leanachan_Forest_-_geograph.org.uk_-_1502041.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled",
    "attribution": {
      "author": "Dorothy Carse",
      "licenseShortName": "CC BY-SA 2.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Singletrack,_Leanachan_Forest_-_geograph.org.uk_-_1502041.jpg",
      "sourceTitle": "Singletrack, Leanachan Forest - geograph.org.uk - 1502041.jpg"
    }
  },
  "vtt-tomac": {
    "slug": "John_Tomac",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5f/John_Tomac.JPG/500px-John_Tomac.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Keanu @ no:wp",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:John_Tomac.JPG",
      "sourceTitle": "John Tomac.JPG"
    }
  },
  "vtt-transmission-t-type": {
    "slug": "Dérailleur",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/75/SRAM_Rival_front_derailleur_-_sideview.jpg/500px-SRAM_Rival_front_derailleur_-_sideview.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Fanny Schertzer",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:SRAM_Rival_front_derailleur_-_sideview.jpg",
      "sourceTitle": "SRAM Rival front derailleur - sideview.jpg"
    }
  },
  "vtt-vergier": {
    "slug": "Loris_Vergier",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0c/Loris_VERGIER.jpg/500px-Loris_VERGIER.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Drikoulinos",
      "licenseShortName": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Loris_VERGIER.jpg",
      "sourceTitle": "Loris VERGIER.jpg"
    }
  },
  "vtt-vouilloz": {
    "slug": "Nicolas_Vouilloz",
    "thumbnailUrl": "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4a/Vouillozmc2011head2.JPG/500px-Vouillozmc2011head2.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    "attribution": {
      "author": "Aurélien Vialatte",
      "licenseShortName": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "commonsUrl": "https://commons.wikimedia.org/wiki/File:Vouillozmc2011head2.JPG",
      "sourceTitle": "Vouillozmc2011head2.JPG"
    }
  }
};
