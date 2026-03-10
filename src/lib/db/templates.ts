import { getSupabaseClient } from "@/lib/supabase";

export interface MessageTemplate {
  id: string;
  user_id: string;
  name: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export const getTemplatesForUser = async (userId: string): Promise<MessageTemplate[]> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching message templates:", error);
    throw error;
  }

  return (data || []) as MessageTemplate[];
};

export const createTemplate = async (
  userId: string,
  payload: { name: string; body: string }
): Promise<MessageTemplate> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("message_templates")
    .insert({
      user_id: userId,
      name: payload.name,
      body: payload.body,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Error creating message template:", error);
    throw error;
  }

  return data as MessageTemplate;
};

export const updateTemplate = async (
  id: string,
  payload: { name: string; body: string }
): Promise<MessageTemplate> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("message_templates")
    .update({
      name: payload.name,
      body: payload.body,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating message template:", error);
    throw error;
  }

  return data as MessageTemplate;
};

export const deleteTemplate = async (id: string): Promise<void> => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("message_templates")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting message template:", error);
    throw error;
  }
};

