const { ipcRenderer } = require('electron');
const { useState, useEffect } = require('react');
const React = require('react');

function UpdateNotification() {
    const [updateStatus, setUpdateStatus] = useState({
        checking: false,
        available: false,
        downloading: false,
        downloaded: false,
        progress: 0,
        error: null,
        currentVersion: '0.0.0',
        newVersion: null,
        releaseNotes: ''
    });

    // Get initial status on component mount
    useEffect(() => {
        const getInitialStatus = async () => {
            try {
                const status = await window.electronAPI.getUpdateStatus();
                setUpdateStatus(prev => ({
                    ...prev,
                    ...status,
                    currentVersion: status.currentVersion || '0.0.0'
                }));
            } catch (error) {
                console.error('Error getting initial update status:', error);
            }
        };

        getInitialStatus();
    }, []);

    useEffect(() => {
        // Set up event listeners
        const updateAvailable = (info) => {
            console.log('Update available:', info);
            setUpdateStatus(prev => ({
                ...prev,
                checking: false,
                available: true,
                downloading: false,
                newVersion: info.version,
                releaseNotes: info.releaseNotes || ''
            }));
        };

        const updateNotAvailable = () => {
            console.log('No update available');
            setUpdateStatus(prev => ({
                ...prev,
                checking: false,
                available: false,
                downloading: false
            }));
        };

        const downloadProgress = (progress) => {
            console.log('Download progress:', progress.percent);
            setUpdateStatus(prev => ({
                ...prev,
                downloading: true,
                progress: progress.percent || 0
            }));
        };

        const updateDownloaded = (info) => {
            console.log('Update downloaded:', info);
            setUpdateStatus(prev => ({
                ...prev,
                downloading: false,
                downloaded: true,
                available: false,
                progress: 100,
                newVersion: info.version,
                releaseNotes: info.releaseNotes || ''
            }));
        };

        const updateError = (error) => {
            console.error('Update error:', error);
            setUpdateStatus(prev => ({
                ...prev,
                checking: false,
                downloading: false,
                error: error.message || 'An error occurred during update.'
            }));
        };

        const updateStatusChanged = (status) => {
            console.log('Update status changed:', status);
            setUpdateStatus(prev => ({
                ...prev,
                checking: status.checking || false
            }));
        };

        // Set up listeners
        const cleanupAvailable = window.electronAPI.onUpdateAvailable(updateAvailable);
        const cleanupNotAvailable = window.electronAPI.onUpdateNotAvailable(updateNotAvailable);
        const cleanupProgress = window.electronAPI.onDownloadProgress(downloadProgress);
        const cleanupDownloaded = window.electronAPI.onUpdateDownloaded(updateDownloaded);
        const cleanupError = window.electronAPI.onUpdateError(updateError);
        const cleanupStatus = window.electronAPI.onUpdateStatus(updateStatusChanged);

        // Listen for download started event
        const onDownloadStarted = () => {
            setUpdateStatus(prev => ({
                ...prev,
                downloading: true,
                progress: 0
            }));
        };

        ipcRenderer.on('update-download-started', onDownloadStarted);

        // Clean up on unmount
        return () => {
            cleanupAvailable();
            cleanupNotAvailable();
            cleanupProgress();
            cleanupDownloaded();
            cleanupError();
            cleanupStatus();
            ipcRenderer.removeListener('update-download-started', onDownloadStarted);
        };
    }, []);

    const handleCheckForUpdates = async () => {
        try {
            setUpdateStatus(prev => ({
                ...prev,
                checking: true,
                error: null,
                available: false,
                downloaded: false
            }));

            // Force a check for updates
            await window.electronAPI.checkForUpdates();

            // If we get here without an error, the check was successful
            // The actual update status will be updated via the event listeners
        } catch (error) {
            console.error('Error checking for updates:', error);
            setUpdateStatus(prev => ({
                ...prev,
                checking: false,
                error: error.message || 'Failed to check for updates. Please try again.'
            }));
        }
    };

    const handleInstallUpdate = async () => {
        try {
            await window.electronAPI.installUpdate();
            // The app will quit and install the update
        } catch (error) {
            console.error('Error installing update:', error);
            setUpdateStatus(prev => ({
                ...prev,
                error: error.message || 'Failed to install update. Please try again.'
            }));
        }
    };

    // Don't show anything if no update is available or downloaded and there's no error
    if (!updateStatus.available && !updateStatus.downloaded && !updateStatus.error) {
        return null;
    }

    return (
        <div className="update-notification">
            <div className="update-content">
                {updateStatus.checking && (
                    <div className="update-message">
                        <div className="spinner"></div>
                        <span>Checking for updates...</span>
                    </div>
                )}

                {updateStatus.available && !updateStatus.downloaded && (
                    <div className="update-available">
                        <h3>Update Available: v{updateStatus.newVersion}</h3>
                        {updateStatus.releaseNotes && (
                            <div className="release-notes">
                                <h4>What's New:</h4>
                                <div dangerouslySetInnerHTML={{ __html: updateStatus.releaseNotes }} />
                            </div>
                        )}
                        <div className="update-actions">
                            <button 
                                className="btn btn-primary" 
                                onClick={handleInstallUpdate}
                                disabled={updateStatus.progress > 0 && updateStatus.progress < 100}
                            >
                                {updateStatus.progress > 0 ? `Downloading... ${Math.round(updateStatus.progress)}%` : 'Download Update'}
                            </button>
                            {updateStatus.progress > 0 && updateStatus.progress < 100 && (
                                <div className="progress-bar">
                                    <div 
                                        className="progress" 
                                        style={{ width: `${updateStatus.progress}%` }}
                                    ></div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {updateStatus.downloaded && (
                    <div className="update-downloaded">
                        <h3>Update Ready to Install</h3>
                        <p>Version {updateStatus.newVersion} has been downloaded and is ready to install.</p>
                        <div className="update-actions">
                            <button 
                                className="btn btn-primary" 
                                onClick={handleInstallUpdate}
                            >
                                Restart & Install Update
                            </button>
                        </div>
                    </div>
                )}

                {updateStatus.error && (
                    <div className="update-error">
                        <p className="error-message">Error: {updateStatus.error}</p>
                        <button 
                            className="btn btn-secondary" 
                            onClick={handleCheckForUpdates}
                        >
                            Retry
                        </button>
                    </div>
                )}
            </div>
            <style jsx>{`
                .update-notification {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: #2d2d2d;
                    color: #fff;
                    border-radius: 8px;
                    padding: 16px;
                    max-width: 400px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                    z-index: 9999;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                }

                .update-content {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .update-message {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid #fff;
                    border-top-color: transparent;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .update-available h3, .update-downloaded h3 {
                    margin: 0 0 10px 0;
                    color: #4dabf7;
                }

                .release-notes {
                    max-height: 200px;
                    overflow-y: auto;
                    margin: 10px 0;
                    padding: 10px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                    font-size: 0.9em;
                }

                .release-notes h4 {
                    margin: 0 0 8px 0;
                    color: #a5d8ff;
                }

                .update-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s;
                }

                .btn-primary {
                    background: #4dabf7;
                    color: #fff;
                }

                .btn-primary:hover {
                    background: #339af0;
                }

                .btn-primary:disabled {
                    background: #74c0fc;
                    cursor: not-allowed;
                }

                .btn-secondary {
                    background: #495057;
                    color: #fff;
                }

                .btn-secondary:hover {
                    background: #343a40;
                }

                .progress-bar {
                    width: 100%;
                    height: 6px;
                    background: #495057;
                    border-radius: 3px;
                    overflow: hidden;
                }

                .progress {
                    height: 100%;
                    background: #4dabf7;
                    transition: width 0.3s ease;
                }

                .error-message {
                    color: #ff8787;
                    margin: 0 0 10px 0;
                }
            `}</style>
        </div>
    );
}

module.exports = UpdateNotification;
