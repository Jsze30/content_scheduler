// Find the next available time slot across upcoming days
export function findNextSlot(posts, timeSlots) {
  const enabledSlots = timeSlots.filter(s => s.enabled).map(s => s.time);
  if (enabledSlots.length === 0) return null;

  const now = new Date();
  // Start from today, look up to 30 days ahead
  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    for (const slotTime of enabledSlots) {
      const slotDateTime = `${dateStr}T${slotTime}:00`;
      const slotDate = new Date(slotDateTime);

      // Skip slots in the past
      if (slotDate <= now) continue;

      // Check if this slot is already taken
      const taken = posts.some(p => {
        if (!p.scheduledAt || p.status !== 'queued') return false;
        const pDate = new Date(p.scheduledAt);
        return Math.abs(pDate - slotDate) < 60000; // within 1 minute
      });

      if (!taken) return new Date(slotDateTime).toISOString();
    }
  }

  return null;
}

// Get all slots for a given day with their fill status
export function getSlotsForDay(dateStr, posts, timeSlots) {
  const enabledSlots = timeSlots.filter(s => s.enabled);

  return enabledSlots.map(slot => {
    const slotDateTime = `${dateStr}T${slot.time}:00`;
    const slotDate = new Date(slotDateTime);

    const filledPost = posts.find(p => {
      if (!p.scheduledAt || p.status !== 'queued') return false;
      const pDate = new Date(p.scheduledAt);
      return Math.abs(pDate - slotDate) < 60000;
    });

    return {
      time: slot.time,
      dateTime: slotDateTime,
      filled: !!filledPost,
      post: filledPost || null,
    };
  });
}
