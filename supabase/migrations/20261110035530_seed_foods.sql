-- Base inicial de alimentos (valores por 100 g, aproximados da Tabela TACO/UNICAMP).
-- A nutricionista pode ajustar/expandir depois.
insert into nutri.foods (name, food_group, kcal_100g, carb_100g, protein_100g, fat_100g, household_unit, household_grams) values
  -- Carboidratos (equivalência por carboidrato)
  ('Arroz branco cozido',        'carboidrato', 128, 28.1,  2.5, 0.2, '1 colher de servir', 45),
  ('Arroz integral cozido',      'carboidrato', 124, 25.8,  2.6, 1.0, '1 colher de servir', 45),
  ('Batata inglesa cozida',      'carboidrato',  52, 11.9,  1.2, 0.0, '1 unidade média', 140),
  ('Batata-doce cozida',         'carboidrato',  77, 18.4,  0.6, 0.1, '1 unidade média', 150),
  ('Mandioca cozida',            'carboidrato', 125, 30.1,  0.6, 0.3, '1 pedaço médio', 80),
  ('Inhame cozido',              'carboidrato',  97, 23.2,  2.1, 0.2, '1 unidade média', 110),
  ('Cuscuz de milho',            'carboidrato', 113, 25.3,  2.2, 0.7, '1 fatia média', 100),
  ('Macarrão cozido',            'carboidrato', 102, 19.9,  3.4, 1.2, '1 pegador', 110),
  ('Pão francês',                'carboidrato', 300, 58.6,  8.0, 3.1, '1 pão', 50),
  ('Pão de forma integral',      'carboidrato', 253, 49.9,  9.4, 3.7, '1 fatia', 25),
  ('Tapioca (goma hidratada)',   'carboidrato', 240, 59.0,  0.0, 0.0, '1 tapioca média', 50),
  ('Aveia em flocos',            'carboidrato', 394, 66.6, 13.9, 8.5, '1 colher de sopa', 15),
  ('Milho verde cozido',         'carboidrato',  98, 19.0,  3.2, 0.6, '1 espiga', 100),
  -- Proteínas (equivalência por proteína)
  ('Peito de frango grelhado',   'proteina', 159,  0.0, 32.0,  2.5, '1 filé médio', 100),
  ('Patinho bovino grelhado',    'proteina', 219,  0.0, 35.9,  7.3, '1 bife médio', 100),
  ('Carne moída refogada',       'proteina', 212,  0.0, 26.7, 10.9, '1 colher de sopa', 25),
  ('Tilápia grelhada',           'proteina', 128,  0.0, 26.2,  2.7, '1 filé médio', 120),
  ('Atum em conserva (água)',    'proteina', 116,  0.0, 25.5,  0.8, '1 lata drenada', 120),
  ('Ovo de galinha cozido',      'proteina', 146,  0.6, 13.3,  9.5, '1 ovo', 50),
  ('Lombo suíno assado',         'proteina', 210,  0.0, 35.7,  6.4, '1 fatia média', 80),
  -- Leguminosas (equivalência por calorias)
  ('Feijão carioca cozido',      'leguminosa',  76, 13.6, 4.8, 0.5, '1 concha média', 140),
  ('Feijão preto cozido',        'leguminosa',  77, 14.0, 4.5, 0.5, '1 concha média', 140),
  ('Lentilha cozida',            'leguminosa',  93, 16.3, 6.3, 0.5, '1 concha média', 140),
  ('Grão-de-bico cozido',        'leguminosa', 164, 27.4, 8.9, 2.6, '1 colher de servir', 50),
  -- Frutas (equivalência por carboidrato)
  ('Banana prata',               'fruta',  98, 26.0, 1.3, 0.1, '1 unidade', 70),
  ('Maçã fuji',                  'fruta',  56, 15.2, 0.3, 0.0, '1 unidade', 130),
  ('Mamão papaia',               'fruta',  40, 10.4, 0.5, 0.1, '1/2 unidade', 150),
  ('Morango',                    'fruta',  30,  6.8, 0.9, 0.3, '1 unidade', 12),
  ('Abacaxi',                    'fruta',  48, 12.3, 0.9, 0.1, '1 fatia', 75),
  ('Laranja pera',               'fruta',  37,  8.9, 1.0, 0.1, '1 unidade', 140),
  ('Manga palmer',               'fruta',  72, 19.4, 0.4, 0.2, '1 fatia', 80),
  ('Uva',                        'fruta',  53, 13.6, 0.7, 0.2, '1 cacho pequeno', 100),
  -- Laticínios (equivalência por calorias)
  ('Iogurte natural integral',   'laticinio',  51,  1.9,  4.1,  3.0, '1 pote', 170),
  ('Leite desnatado',            'laticinio',  35,  4.9,  3.4,  0.1, '1 copo', 200),
  ('Queijo minas frescal',       'laticinio', 264,  3.2, 17.4, 20.2, '1 fatia', 30),
  ('Queijo cottage',             'laticinio',  98,  3.4, 11.1,  4.3, '1 colher de sopa', 30),
  -- Gorduras (equivalência por gordura)
  ('Azeite de oliva',            'gordura', 884,  0.0,  0.0, 100.0, '1 colher de sopa', 8),
  ('Abacate',                    'gordura',  96,  6.0,  1.2,   8.4, '1 colher de sopa', 45),
  ('Castanha-do-pará',           'gordura', 643, 15.1, 14.5,  63.5, '1 unidade', 4),
  ('Pasta de amendoim',          'gordura', 588, 20.0, 25.0,  50.0, '1 colher de sopa', 15),
  ('Castanha de caju',           'gordura', 570, 29.1, 18.5,  46.3, '1 unidade', 2.5)
on conflict (name) do nothing;
