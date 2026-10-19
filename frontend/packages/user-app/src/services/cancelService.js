// Emergency cancel service with 30s window
export const cancelEmergency = async (missionId) => {
  try {
    const response = await fetch(`http://localhost:3000/api/emergency/${missionId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        cancelledAt: new Date().toISOString(),
        reason: 'User cancelled - false alarm'
      })
    });
    return response.ok;
  } catch (error) {
    console.error('Cancel failed:', error);
    return false;
  }
};

// Auto-cancel timeout handler
export const createCancelWindow = (missionId, timeout = 30000) => {
  return setTimeout(async () => {
    await cancelEmergency(missionId);
  }, timeout);
};
