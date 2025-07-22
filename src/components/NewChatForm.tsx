const onSubmit = async (values: NewChatFormValues) => {
  if (!session?.user?.id) {
    toast.error('User not authenticated.');
    return;
  }

  try {
    const { data: newChatData, error: chatError } = await supabase
      .from('chats')
      .insert({ 
        type: 'private',
        name: values.name || null,
        created_by: session.user.id,  // Required for RLS
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (chatError) throw chatError;

    // Add participants (including the creator)
    const { error: participantError } = await supabase
      .from('chat_participants')
      .insert({
        chat_id: newChatData.id,
        user_id: session.user.id
      });

    if (participantError) throw participantError;

    onSuccess(newChatData.id);
    toast.success('Chat created successfully!');
    
  } catch (error: any) {
    console.error('Chat creation error:', error);
    toast.error('Failed to create chat: ' + error.message);
  }
};