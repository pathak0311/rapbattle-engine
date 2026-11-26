
import whisper, json, sys
src, out = sys.argv[1], sys.argv[2]
m = whisper.load_model('base')
r = m.transcribe(src, language='en', word_timestamps=True, fp16=False, condition_on_previous_text=False)
words = [{'w': w['word'].strip(), 's': round(w['start'],2), 'e': round(w['end'],2)} for s in r['segments'] for w in s.get('words', [])]
json.dump(words, open(out, 'w'))
print('n', len(words))
for w in words[-30:]: print(w['s'], w['e'], w['w'])

