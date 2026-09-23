import Image from 'next/image';
import type {HintImage, HintPart} from '@/rally/types';
import styles from './RallyHint.module.css';

export default function RallyHint({text, parts, image, layout}: {text: string; parts?: HintPart[]; image?: HintImage; layout?: 'verse'}) {
  const imageUrl = image ? `${process.env.NEXT_PUBLIC_BASE_PATH || ''}${image.src}` : undefined;
  const content = parts?.map((part, index) => {
    const text = part.underline ? <u>{part.text}</u> : part.text;
    return part.bold ? <strong key={index}>{text}</strong> : <span key={index}>{text}</span>;
  }) ?? text;
  return <div>
    {layout === 'verse' ? <>
      <div className={styles.verse} tabIndex={0} role="region" aria-label="Hinweis in Verszeilen, seitlich scrollbar">{content}</div>
      <p className={styles.caption}>Bei Bedarf seitlich wischen, um jede Zeile vollständig zu lesen.</p>
    </> : <p className={styles.text}>{content}</p>}
    {image && imageUrl && <figure className={styles.figure}>
      <a href={imageUrl} target="_blank" rel="noopener" aria-label="Hinweisbild in voller Größe öffnen (neuer Tab)">
        <Image src={imageUrl} alt={image.alt} width={image.width} height={image.height} className={styles.image} unoptimized/>
      </a>
      <figcaption className={styles.caption}><a href={imageUrl} target="_blank" rel="noopener">Bild in voller Größe öffnen</a></figcaption>
    </figure>}
  </div>;
}
