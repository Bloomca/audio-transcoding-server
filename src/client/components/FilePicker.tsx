type FilePickerProps = {
  onPickTracks?: () => void;
  onPickFolders?: () => void;
};

function FilePicker({ onPickTracks, onPickFolders }: FilePickerProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Upload</h2>
        <p>Start with track or folder selection. The picker wiring comes next.</p>
      </div>

      <div className="mode-row">
        <button type="button" onClick={onPickTracks}>
          Select tracks
        </button>
        <button type="button" onClick={onPickFolders}>
          Select folders
        </button>
      </div>
    </section>
  );
}

export { FilePicker };
