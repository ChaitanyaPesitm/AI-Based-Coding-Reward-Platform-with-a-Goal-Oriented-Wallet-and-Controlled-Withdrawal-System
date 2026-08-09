const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// Mock ad content keyed by goal category.
// In production, swap these with real AdSense ad unit IDs or affiliate links.
const ADS_BY_CATEGORY = {
  laptop: [
    {
      id: 'lap1',
      title: 'Dell Inspiron 15 — ₹45,990',
      description: 'Intel i5 12th Gen, 16 GB RAM, 512 GB SSD. Perfect for coding!',
      cta: 'View Deal',
      url: 'https://www.dell.com',
      badge: '🏷️ Best Value',
      sponsor: 'Dell'
    },
    {
      id: 'lap2',
      title: 'Lenovo IdeaPad Slim 5 — ₹52,490',
      description: 'AMD Ryzen 7, 16 GB RAM, 512 GB SSD. Ultra-thin & powerful.',
      cta: 'Shop Now',
      url: 'https://www.lenovo.com',
      badge: '⭐ Top Rated',
      sponsor: 'Lenovo'
    }
  ],
  course: [
    {
      id: 'crs1',
      title: 'Udemy — Courses from ₹399',
      description: 'Master DSA, Web Dev, ML. 200k+ courses. Lifetime access.',
      cta: 'Browse Courses',
      url: 'https://www.udemy.com',
      badge: '🎓 Bestseller',
      sponsor: 'Udemy'
    },
    {
      id: 'crs2',
      title: 'Coursera Professional Certificates',
      description: 'Google, Meta, IBM certifications. Get job-ready in 6 months.',
      cta: 'Enroll Free',
      url: 'https://www.coursera.org',
      badge: '🏅 Certified',
      sponsor: 'Coursera'
    }
  ],
  travel: [
    {
      id: 'trv1',
      title: 'MakeMyTrip — Up to 40% Off Flights',
      description: 'Book domestic & international flights at the lowest prices.',
      cta: 'Book Now',
      url: 'https://www.makemytrip.com',
      badge: '✈️ Best Price',
      sponsor: 'MakeMyTrip'
    },
    {
      id: 'trv2',
      title: 'Airbnb — Unique Stays Worldwide',
      description: 'Find homes, cabins & experiences for your next trip.',
      cta: 'Explore',
      url: 'https://www.airbnb.com',
      badge: '🏠 Unique Stays',
      sponsor: 'Airbnb'
    }
  ],
  gadget: [
    {
      id: 'gad1',
      title: 'Amazon — Today\'s Deals on Electronics',
      description: 'Headphones, smartwatches, tablets. Limited time offers!',
      cta: 'See Deals',
      url: 'https://www.amazon.in',
      badge: '⚡ Flash Sale',
      sponsor: 'Amazon'
    },
    {
      id: 'gad2',
      title: 'Flipkart — Big Billion Days',
      description: 'Smartphones & accessories at unbeatable prices.',
      cta: 'Shop Now',
      url: 'https://www.flipkart.com',
      badge: '🔥 Hot Deal',
      sponsor: 'Flipkart'
    }
  ],
  savings: [
    {
      id: 'sav1',
      title: 'Zerodha — Start Investing Today',
      description: 'India\'s largest stockbroker. Zero brokerage on equity delivery.',
      cta: 'Open Account',
      url: 'https://zerodha.com',
      badge: '📈 #1 Broker',
      sponsor: 'Zerodha'
    },
    {
      id: 'sav2',
      title: 'Fi Money — 7% Interest on Savings',
      description: 'Smart savings account. No minimum balance. Instant FD.',
      cta: 'Join Now',
      url: 'https://fi.money',
      badge: '💰 High Interest',
      sponsor: 'Fi Money'
    }
  ],
  custom: [
    {
      id: 'gen1',
      title: 'Sponsored: Keep Coding, Keep Earning',
      description: 'Solve more problems to reach your financial goals faster!',
      cta: 'View Problems',
      url: '/problems',
      badge: '💡 Tip',
      sponsor: 'CodeRewards'
    }
  ]
};

// Sponsored challenges (shown on problems page)
const SPONSORED_CHALLENGES = [
  {
    id: 'sp1',
    sponsor: 'TechCorp',
    title: 'Array Optimization Challenge',
    description: 'Optimize an array sorting algorithm. Top 3 solutions win ₹500 each!',
    prize: '₹500',
    deadline: '2026-09-01',
    category: 'algorithms'
  },
  {
    id: 'sp2',
    sponsor: 'DataStart',
    title: 'String Parsing Hackathon',
    description: 'Build the fastest string parser. Winners featured on DataStart careers page.',
    prize: '₹300',
    deadline: '2026-08-25',
    category: 'strings'
  }
];

// GET /api/ads?category=laptop - Get ads for a goal category
router.get('/', protect, (req, res) => {
  const { category = 'custom' } = req.query;
  const ads = ADS_BY_CATEGORY[category] || ADS_BY_CATEGORY.custom;

  // Pick one ad at random (or return all — client can rotate)
  res.json({
    success: true,
    category,
    data: ads,
    sponsoredChallenges: SPONSORED_CHALLENGES
  });
});

// GET /api/ads/sponsored-challenges
router.get('/sponsored-challenges', protect, (req, res) => {
  res.json({ success: true, data: SPONSORED_CHALLENGES });
});

module.exports = router;
