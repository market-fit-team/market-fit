import { HomeCtaWidget } from "@/features/home/components/home-cta-widget/home-cta-widget"
import { MainPostCarouselWidget } from "@/features/post/components/main-post-carousel-widget/main-post-carousel-widget"
import { TrendForecastBannerWidget } from "@/features/trend/components/trend-forecast-banner-widget/trend-forecast-banner-widget"

export default function HomePage() {
  return (
    <main className="flex-1 bg-muted/30 pb-20">
      <TrendForecastBannerWidget />

      <div className="mx-auto mt-12 max-w-7xl space-y-16 px-4 sm:px-6 lg:px-8">
        <HomeCtaWidget />
        <MainPostCarouselWidget />
      </div>
    </main>
  )
}
