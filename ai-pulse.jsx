export const refreshFrequency = 600000; // 10 minutes

export const render = () => {
  return (
    <div style={{
      position: 'absolute',
      top: '50px',
      right: '50px',
      width: '400px',
      height: '600px',
      overflow: 'hidden',
      borderRadius: '20px',
      boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
    }}>
      <iframe 
        src="file:///Users/yangjiawen/Desktop/ai-pulse-2025/index.html?mode=widget"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          backgroundColor: 'transparent'
        }}
      />
    </div>
  );
}

export const style = `
  -webkit-user-select: none;
`
