const { useState, useEffect } = require('react');

function UpdateSettings() {
    const [settings, setSettings] = useState({
        autoUpdate: true,
        lastUpdateCheck: null,
        currentVersion: '0.0.0',
        checking: false
    });

    useEffect(() => {
        // Load initial settings
        const loadSettings = async () => {
            try {
                const status = await window.electronAPI.getUpdateStatus();
                setSettings(prev => ({
                    ...prev,
                    autoUpdate: status.autoUpdate,
                    lastUpdateCheck: status.lastUpdateCheck,
                    currentVersion: status.currentVersion
                }));
            } catch (error) {
                console.error('Error loading update settings:', error);
            }
        };

        loadSettings();
    }, []);

    const handleAutoUpdateChange = async (e) => {
        const enabled = e.target.checked;
        try {
            await window.electronAPI.setAutoUpdate(enabled);
            setSettings(prev => ({
                ...prev,
                autoUpdate: enabled
            }));
        } catch (error) {
            console.error('Error updating auto-update setting:', error);
        }
    };

    const handleCheckForUpdates = async () => {
        try {
            setSettings(prev => ({ ...prev, checking: true }));
            await window.electronAPI.checkForUpdates(true);
        } catch (error) {
            console.error('Error checking for updates:', error);
        } finally {
            setSettings(prev => ({ ...prev, checking: false }));
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        try {
            return new Date(dateString).toLocaleString();
        } catch (e) {
            return 'Unknown';
        }
    };

    return (
        <div className="update-settings">
            <h2>Update Settings</h2>
            
            <div className="setting-group">
                <div className="setting-item">
                    <label className="toggle-switch">
                        <input 
                            type="checkbox" 
                            checked={settings.autoUpdate} 
                            onChange={handleAutoUpdateChange}
                        />
                        <span className="slider"></span>
                    </label>
                    <div className="setting-details">
                        <h3>Automatic Updates</h3>
                        <p>Automatically check for and install updates</p>
                    </div>
                </div>

                <div className="setting-item">
                    <div className="setting-details">
                        <h3>Current Version</h3>
                        <p>v{settings.currentVersion}</p>
                    </div>
                </div>

                <div className="setting-item">
                    <div className="setting-details">
                        <h3>Last Checked</h3>
                        <p>{formatDate(settings.lastUpdateCheck)}</p>
                    </div>
                </div>

                <button 
                    className="check-updates-btn"
                    onClick={handleCheckForUpdates}
                    disabled={settings.checking}
                >
                    {settings.checking ? 'Checking...' : 'Check for Updates'}
                </button>
            </div>

            <style jsx>{`
                .update-settings {
                    padding: 20px;
                    color: #e0e0e0;
                }

                h2 {
                    margin-top: 0;
                    color: #4dabf7;
                    border-bottom: 1px solid #444;
                    padding-bottom: 10px;
                }
                
                .setting-group {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                
                .setting-item {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    padding: 10px 0;
                    border-bottom: 1px solid #333;
                }
                
                .setting-details h3 {
                    margin: 0 0 4px 0;
                    font-size: 0.95em;
                    color: #f0f0f0;
                }
                
                .setting-details p {
                    margin: 0;
                    font-size: 0.85em;
                    color: #aaa;
                }
                
                .toggle-switch {
                    position: relative;
                    display: inline-block;
                    width: 50px;
                    height: 24px;
                }
                
                .toggle-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                
                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #555;
                    transition: .4s;
                    border-radius: 24px;
                }
                
                .slider:before {
                    position: absolute;
                    content: "";
                    height: 16px;
                    width: 16px;
                    left: 4px;
                    bottom: 4px;
                    background-color: white;
                    transition: .4s;
                    border-radius: 50%;
                }
                
                input:checked + .slider {
                    background-color: #4dabf7;
                }
                
                input:checked + .slider:before {
                    transform: translateX(26px);
                }
                
                .check-updates-btn {
                    margin-top: 15px;
                    padding: 8px 16px;
                    background-color: #4dabf7;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 0.9em;
                    transition: background-color 0.2s;
                }
                
                .check-updates-btn:hover {
                    background-color: #339af0;
                }
                
                .check-updates-btn:disabled {
                    background-color: #74c0fc;
                    cursor: not-allowed;
                }
            `}</style>
        </div>
    );
}

module.exports = UpdateSettings;
