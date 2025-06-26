function renderForm() {
  const isPhone = formType === "phone";
  return (
    <form className="card" style={{ maxWidth: 400 }} onSubmit={handleSubmit}>
      <h3 style={{ marginBottom: 10 }}>
        {editingId ? "Edit Device" : "Add Device"}
      </h3>
      <input
        name="nickname"
        type="text"
        className="input"
        value={form.nickname}
        onChange={handleInput}
        required
        maxLength={40}
        placeholder="Device Nickname (e.g. Dad's MacBook, Work iPhone)"
      />
      <select
        name="make"
        className="input"
        value={form.make}
        onChange={handleInput}
        required
      >
        <option value="">Select Make</option>
        {(isPhone ? PHONE_MAKES : COMPUTER_MAKES).map(make =>
          <option key={make} value={make}>{make}</option>
        )}
      </select>
      {isPhone ? (
        <>
          <input
            name="phoneNumber"
            type="text"
            className="input"
            value={form.phoneNumber}
            onChange={handleInput}
            maxLength={18}
            placeholder="Phone Number"
          />
          <input
            name="phonePasscode"
            type="password"
            className="input"
            value={form.phonePasscode}
            onChange={handleInput}
            minLength={4}
            maxLength={18}
            autoComplete="new-password"
            placeholder="Phone Passcode"
          />
          <input
            type="password"
            className="input"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            minLength={4}
            maxLength={18}
            autoComplete="new-password"
            required
            placeholder="Confirm Passcode"
          />
          {confirm && !passValid && (
            <span style={{ color: "#b40000", fontSize: 13 }}>
              Passcodes do not match.
            </span>
          )}
        </>
      ) : (
        <>
          <input
            name="username"
            type="text"
            className="input"
            value={form.username}
            onChange={handleInput}
            maxLength={24}
            placeholder="Computer Username"
          />
          <input
            name="loginPassword"
            type="password"
            className="input"
            value={form.loginPassword}
            onChange={handleInput}
            minLength={4}
            maxLength={30}
            autoComplete="new-password"
            placeholder="Computer Password"
          />
          <input
            type="password"
            className="input"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            minLength={4}
            maxLength={30}
            autoComplete="new-password"
            required
            placeholder="Confirm Password"
          />
          {confirm && !passValid && (
            <span style={{ color: "#b40000", fontSize: 13 }}>
              Passwords do not match.
            </span>
          )}
        </>
      )}
      <select
        name="contact"
        className="input"
        value={form.contact}
        onChange={handleInput}
        required
      >
        <option value="">Select Contact</option>
        {contacts.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <textarea
        name="notes"
        className="input"
        value={form.notes}
        onChange={handleInput}
        rows={3}
        maxLength={300}
        placeholder="Notes / Wishes (how to handle this device)"
      />
      <div>
        <span style={{ fontSize: 13, color: "#746e80" }}>Device Image</span>
        <input
          ref={fileInput}
          name="image"
          type="file"
          accept="image/*"
          className="input"
          onChange={handleImage}
          style={{ marginTop: 4 }}
        />
        {form.imageUrl && (
          <img
            src={form.imageUrl}
            alt="Device"
            style={{
              width: 80, height: 80, objectFit: "cover",
              display: "block", margin: "10px 0", borderRadius: 8
            }}
          />
        )}
      </div>
      <div style={{ marginTop: 15, display: "flex", gap: 10 }}>
        <button
          type="submit"
          className="btn-main"
          disabled={uploading || (confirm && !passValid)}
          style={{ flex: 1 }}
        >
          {editingId ? "Update" : "Add"}
        </button>
        {editingId && (
          <button
            type="button"
            className="btn-danger"
            onClick={handleDelete}
          >
            Delete
          </button>
        )}
        <button
          type="button"
          className="btn-cancel"
          onClick={closeForm}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
