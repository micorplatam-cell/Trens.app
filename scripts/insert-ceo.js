const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function insertCEO() {
  // Buscar el user_id por email
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();

  if (userError) {
    console.error('Error listando usuarios:', userError);
    return;
  }

  const ceoUser = users.users.find((u) => u.email === 'micorp.latam@gmail.com');

  if (!ceoUser) {
    console.log('❌ Usuario micorp.latam@gmail.com no encontrado');
    console.log('📧 Emails disponibles:', users.users.map((u) => u.email).slice(0, 10));
    return;
  }

  console.log('✅ Usuario encontrado:', ceoUser.id);

  // Insertar como CEO
  const { data, error } = await supabase
    .from('admin_users')
    .upsert(
      {
        user_id: ceoUser.id,
        email: 'micorp.latam@gmail.com',
        role: 'ceo',
        permissions: {
          rutinas: true,
          ejercicios: true,
          usuarios: true,
          pagos: true,
          finanzas: true,
        },
      },
      { onConflict: 'email' }
    )
    .select();

  if (error) {
    console.error('❌ Error insertando CEO:', error);
  } else {
    console.log('🎉 CEO insertado correctamente:', data);
  }
}

insertCEO();
