select au.email, ur.nombre, ur.created_at
from user_roles ur
join auth.users au on au.id = ur.user_id
where ur.role = 'basico'
order by ur.created_at desc;
