UPDATE users SET unlocked_skins = COALESCE(unlocked_skins, 'default') || ',toxic' WHERE id = 'raclosdev' AND COALESCE(unlocked_skins, '') NOT LIKE '%toxic%';
