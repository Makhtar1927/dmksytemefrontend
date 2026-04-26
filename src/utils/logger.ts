import { supabase } from '../lib/supabase';

export const logActivity = async (
  action_type: string,
  entity_type: string,
  details: string,
  sector: string = 'N/A'
) => {
  try {
    // 1. Obtenir l'utilisateur connecté
    const { data: { session } } = await supabase.auth.getSession();
    const user_email = session?.user?.email || 'System';

    // 2. Insérer le log
    const { error } = await supabase
      .from('activity_logs')
      .insert([
        {
          user_email,
          action_type,
          entity_type,
          details,
          sector,
        }
      ]);

    if (error) {
      console.error("Erreur lors de l'insertion dans activity_logs:", error);
    }
  } catch (error) {
    console.error("Erreur inattendue dans logActivity:", error);
  }
};
