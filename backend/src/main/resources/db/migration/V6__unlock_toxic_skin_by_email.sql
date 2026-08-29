UPDATE users SET unlocked_skins = COALESCE(unlocked_skins, 'default') || ',toxic' WHERE email = 'raclosdev@gmail.com' AND COALESCE(unlocked_skins, '') NOT LIKE '%toxic%';
