export default function HeroSection() {
  return (
    <section className='relative overflow-hidden px-4 py-20'>
      <div
        className='pointer-events-none absolute inset-0 opacity-30 dark:opacity-20'
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className='relative mx-auto max-w-screen-xl text-center'>
        <h1 className='shimmer-text mb-4 text-5xl font-extrabold'>
          規劃你的旅程
        </h1>
        <p className='text-muted-foreground mx-auto max-w-md text-lg'>
          像卡牌一樣排列景點，輕鬆安排每一天的行程
        </p>
      </div>
    </section>
  );
}
