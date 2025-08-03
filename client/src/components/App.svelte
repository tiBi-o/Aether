<script>
  let prompt = '';
  let aiResult = '';
  let loading = false;
  let error = '';

  import { submitPrompt as submitPromptApi } from '../lib/api';

  async function submitPrompt() {
    aiResult = '';
    error = '';
    loading = true;
    try {
      const data = await submitPromptApi(prompt);
      aiResult = data.result || JSON.stringify(data);
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

<div class="prompt-card">
  <h2>AetherPress Prompt</h2>
  <form on:submit|preventDefault={submitPrompt}>
    <textarea
      bind:value={prompt}
      rows="3"
      placeholder="Enter your creative prompt..."
      required
    ></textarea>
    <button type="submit" disabled={loading || !prompt.trim()}>
      {loading ? 'Generating...' : 'Generate'}
    </button>
  </form>
  {#if error}
    <div class="error">{error}</div>
  {/if}
  {#if aiResult}
    <div class="result">
      <strong>AI Result:</strong>
      <pre>{aiResult}</pre>
    </div>
  {/if}
</div>

<style>
  .prompt-card {
    max-width: 420px;
    margin: 2rem auto;
    padding: 1.5rem 1.2rem;
    border-radius: 12px;
    box-shadow: 0 2px 12px #0001;
    background: #fff;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  textarea {
    width: 100%;
    font-size: 1rem;
    border-radius: 6px;
    border: 1px solid #ccc;
    padding: 0.5rem;
    resize: vertical;
  }
  button {
    width: 100%;
    padding: 0.7rem;
    font-size: 1rem;
    border-radius: 6px;
    border: none;
    background: #ff3e00;
    color: #fff;
    cursor: pointer;
    transition: background 0.2s;
  }
  button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
  .error {
    color: #b00020;
    background: #ffeaea;
    border-radius: 6px;
    padding: 0.5rem;
    font-size: 0.95rem;
  }
  .result {
    background: #f6f8fa;
    border-radius: 6px;
    padding: 0.7rem;
    font-size: 0.98rem;
    overflow-x: auto;
  }
  pre {
    margin: 0.5rem 0 0 0;
    white-space: pre-wrap;
    word-break: break-word;
  }
</style>
