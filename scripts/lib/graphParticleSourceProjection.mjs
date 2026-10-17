/** Newest exact source projection only. Graph -> Particle ->648; no old helper import/cycle. */
import assert from 'node:assert/strict'
import {canonicalBeforeNetworkSources} from './networkSourceProjection.mjs'
import {createHash} from 'node:crypto'
import {canonicalBeforeGraphDebugOwner,assertGraphDebugOwnerQualification} from './graphDebugOwnerContract.mjs'
import {canonicalBeforeParticleOwner,validateParticleOwner} from './particleOwnerContract.mjs'
const history=[
  {
    "path": "src/assets/tiledMapAssets.ts",
    "accepted": [
      {
        "sha256": "05fa91b1a52e2d9f0888a719963b8d4dd2e9d19207e9fb311c43658cb64dcc60",
        "origins": [
          {
            "sourceRecordSha256": "5a228f0f966daec07eccac310537f442ab3ffe3b009404eda9d0ae3ecfb22568",
            "jsonPointer": "/files/147",
            "phase": "actual sealed648 full source"
          }
        ]
      },
      {
        "sha256": "af4831244062389a7fc766a4bb33e9eb0e2ec1c08b814c9f7a97149ac512e393",
        "origins": [
          {
            "fixture": "scripts/lib/fixtures/tileMapOwner.contract.json",
            "fixtureSha256": "ae2a47a40c1215ace116116f867944b101a3af1bcd80836d05f4020c4ba140ad",
            "jsonPointer": "/candidateFiles/3/beforeSha256"
          }
        ]
      }
    ]
  },
  {
    "path": "src/components/WorldCanvas.vue",
    "accepted": [
      {
        "sha256": "5e8d0d04831ef66ef26ff48d4f585290551b049f01f5ac828e48b160bf084e34",
        "origins": [
          {
            "sourceRecordSha256": "5a228f0f966daec07eccac310537f442ab3ffe3b009404eda9d0ae3ecfb22568",
            "jsonPointer": "/files/224",
            "phase": "actual sealed648 full source"
          },
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/8/acceptedBefore/7/sha256"
          }
        ]
      },
      {
        "sha256": "c60bca1c7dac03d10f81ac7ab341c18be90fc62866ea31ca93139d2a23c8c9a1",
        "origins": [
          {
            "fixture": "scripts/lib/fixtures/tileMapOwner.contract.json",
            "fixtureSha256": "ae2a47a40c1215ace116116f867944b101a3af1bcd80836d05f4020c4ba140ad",
            "jsonPointer": "/candidateFiles/11/beforeSha256"
          },
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/8/acceptedBefore/0/sha256"
          }
        ]
      },
      {
        "sha256": "eff1ccf38e597c833f8f5b3dd65808a96f952e2ab3a951bd5415ef122e7c64ff",
        "origins": [
          {
            "fixture": "scripts/lib/fixtures/tileMapOwner.contract.json",
            "fixtureSha256": "ae2a47a40c1215ace116116f867944b101a3af1bcd80836d05f4020c4ba140ad",
            "jsonPointer": "/candidateFiles/11/approvedHistoricalBeforeSha256/0"
          },
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/8/acceptedBefore/5/sha256"
          }
        ]
      },
      {
        "sha256": "bbbca2412e60f3a4caa4f52cb71fb3e5d79bcaa0f403d98b0ea1183459bde9b9",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/8/acceptedBefore/1/sha256"
          }
        ]
      },
      {
        "sha256": "47bf937c0d29479132e1215300282c404514ddbb8ffe56920321bf208e44b1fb",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/8/acceptedBefore/2/sha256"
          }
        ]
      },
      {
        "sha256": "8aa77dd491da80cbc6d9bb9a4ad47a8490f604a141f1b319c1c738e2fcc9af4a",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/8/acceptedBefore/3/sha256"
          }
        ]
      },
      {
        "sha256": "de0cb736815c73ebc764da3b53c2fcd3524094ad00a93241dddf2da7b14255e5",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/8/acceptedBefore/4/sha256"
          }
        ]
      },
      {
        "sha256": "4c5363af266521a7c85fcf630d5b23bb6aab8f23d72c0c32a23434c0e8dc5b8e",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/8/acceptedBefore/6/sha256"
          }
        ]
      }
    ]
  },
  {
    "path": "src/editor/aiAdapter.ts",
    "accepted": [
      {
        "sha256": "da5ae890a60cf444ad663b15091be049f455d7849a2904d1082f17691bc11904",
        "origins": [
          {
            "sourceRecordSha256": "5a228f0f966daec07eccac310537f442ab3ffe3b009404eda9d0ae3ecfb22568",
            "jsonPointer": "/files/229",
            "phase": "actual sealed648 full source"
          }
        ]
      }
    ]
  },
  {
    "path": "src/editor/entityBuilderAdapter.ts",
    "accepted": [
      {
        "sha256": "9dfe523b0427f01543d9c401cb899f2504c2a19cacd02e80547fc5dc3f11ae9e",
        "origins": [
          {
            "sourceRecordSha256": "5a228f0f966daec07eccac310537f442ab3ffe3b009404eda9d0ae3ecfb22568",
            "jsonPointer": "/files/243",
            "phase": "actual sealed648 full source"
          }
        ]
      },
      {
        "sha256": "df8474b12ab65fa601edb3953a5206ee1e6c6cb60df0da9860b554f30c3c8f99",
        "origins": [
          {
            "fixture": "scripts/lib/fixtures/tileMapOwner.contract.json",
            "fixtureSha256": "ae2a47a40c1215ace116116f867944b101a3af1bcd80836d05f4020c4ba140ad",
            "jsonPointer": "/candidateFiles/9/beforeSha256"
          }
        ]
      }
    ]
  },
  {
    "path": "src/editor/gameplayWorldHost.ts",
    "accepted": [
      {
        "sha256": "e9b1f5e90d1107ff04913c2ea4baf9685377e67fca8cf969ad9713041046c7c0",
        "origins": [
          {
            "sourceRecordSha256": "5a228f0f966daec07eccac310537f442ab3ffe3b009404eda9d0ae3ecfb22568",
            "jsonPointer": "/files/251",
            "phase": "actual sealed648 full source"
          },
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/5/acceptedBefore/0/sha256"
          },
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/5/acceptedBefore/11/sha256"
          }
        ]
      },
      {
        "sha256": "5a34fe8386047ec41944034d14f3c9b334ebafda707c47456d39c546acbefd43",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/5/acceptedBefore/1/sha256"
          }
        ]
      },
      {
        "sha256": "c3a1205537460b41119797683d5ee4023088902381e04e3352cbbab6b8a6461e",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/5/acceptedBefore/2/sha256"
          }
        ]
      },
      {
        "sha256": "cc01d76f06fe152acc10e4c447b12e0909151f3f28a0517277365a8f2c1b8c44",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/5/acceptedBefore/3/sha256"
          }
        ]
      },
      {
        "sha256": "ac64e4be6257c637b6553077de743a23123373a100e5d3f1ea4cef3495cc7e42",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/5/acceptedBefore/4/sha256"
          }
        ]
      },
      {
        "sha256": "d48c9285cb13afc98f4242eaba664cbed2641ffa44edb9f8d3ad3556ac7596d9",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/5/acceptedBefore/5/sha256"
          }
        ]
      },
      {
        "sha256": "df66867a31bdf21f1ef85d9898cb2eeaa66570e43a8cec6df2d7702b195bfcac",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/5/acceptedBefore/6/sha256"
          }
        ]
      },
      {
        "sha256": "d891d21a3fd532a9c13ad62c6211e448870fa7b2fbebcc35f271c8af0f127a49",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/5/acceptedBefore/7/sha256"
          }
        ]
      },
      {
        "sha256": "40c5598cd76c9f7b14103b9bb4802f0e371dae5048607d6e21114e5d24cb69ef",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/5/acceptedBefore/8/sha256"
          }
        ]
      },
      {
        "sha256": "80e81d1ed67032816f057f70c5f8a4a902bb213f71e2cc69b40b3d19890d2db8",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/5/acceptedBefore/9/sha256"
          }
        ]
      },
      {
        "sha256": "61e1565c4f218e7691a1cb4c27256a60fdab67b162acf71b1b35a0258b5b02b8",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/5/acceptedBefore/10/sha256"
          }
        ]
      }
    ]
  },
  {
    "path": "src/editor/navigationAdapter.ts",
    "accepted": [
      {
        "sha256": "beb452fd2dad9b005549fc4b3d2864f441e8dbffb07fa872684b727d2151b894",
        "origins": [
          {
            "sourceRecordSha256": "5a228f0f966daec07eccac310537f442ab3ffe3b009404eda9d0ae3ecfb22568",
            "jsonPointer": "/files/265",
            "phase": "actual sealed648 full source"
          }
        ]
      },
      {
        "sha256": "4199c05168f9c1fdfdef421711c942ff19bf6ace55473a579499f08f98a962cc",
        "origins": [
          {
            "fixture": "scripts/lib/fixtures/tileMapOwner.contract.json",
            "fixtureSha256": "ae2a47a40c1215ace116116f867944b101a3af1bcd80836d05f4020c4ba140ad",
            "jsonPointer": "/candidateFiles/8/beforeSha256"
          }
        ]
      }
    ]
  },
  {
    "path": "src/editor/rendererAdapter.ts",
    "accepted": [
      {
        "sha256": "77d1037b32e449775482c37848fb6b7afe841096c2e3749e316b5f86c65bb7b6",
        "origins": [
          {
            "sourceRecordSha256": "5a228f0f966daec07eccac310537f442ab3ffe3b009404eda9d0ae3ecfb22568",
            "jsonPointer": "/files/290",
            "phase": "actual sealed648 full source"
          },
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/7/acceptedBefore/1/sha256"
          }
        ]
      },
      {
        "sha256": "5bbeb0d69aa6d103aa422de60bfed956ab4fac89c5b45c7bc3c3aed83ee9219c",
        "origins": [
          {
            "fixture": "scripts/lib/fixtures/tileMapOwner.contract.json",
            "fixtureSha256": "ae2a47a40c1215ace116116f867944b101a3af1bcd80836d05f4020c4ba140ad",
            "jsonPointer": "/candidateFiles/10/beforeSha256"
          },
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/7/acceptedBefore/0/sha256"
          }
        ]
      }
    ]
  },
  {
    "path": "src/editor/tileMapAdapter.ts",
    "accepted": [
      {
        "sha256": "8b8e7d402b3276c6f2262c7db4ec34ce924e4ba8387e9b02b0293340616200bb",
        "origins": [
          {
            "sourceRecordSha256": "5a228f0f966daec07eccac310537f442ab3ffe3b009404eda9d0ae3ecfb22568",
            "jsonPointer": "/files/647",
            "phase": "actual sealed648 full source"
          }
        ]
      }
    ]
  },
  {
    "path": "src/editor/worldGameplayAdapter.ts",
    "accepted": [
      {
        "sha256": "2a8b362778c978b3b76e98190674146879699051fd2b5e3b8577570d8406b997",
        "origins": [
          {
            "sourceRecordSha256": "5a228f0f966daec07eccac310537f442ab3ffe3b009404eda9d0ae3ecfb22568",
            "jsonPointer": "/files/319",
            "phase": "actual sealed648 full source"
          },
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/6/acceptedBefore/2/sha256"
          }
        ]
      },
      {
        "sha256": "6f165b79394086df96700e0f709d2bd48e804187b9d7123dbc445705d16353a4",
        "origins": [
          {
            "fixture": "scripts/lib/fixtures/tileMapOwner.contract.json",
            "fixtureSha256": "ae2a47a40c1215ace116116f867944b101a3af1bcd80836d05f4020c4ba140ad",
            "jsonPointer": "/candidateFiles/5/beforeSha256"
          },
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/6/acceptedBefore/0/sha256"
          }
        ]
      },
      {
        "sha256": "65aa93d32d8996c4b822766a53b9d143a59d09d38a975bc6825c9e69b25b061d",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/6/acceptedBefore/1/sha256"
          }
        ]
      }
    ]
  },
  {
    "path": "src/renderer/sceneRenderer.ts",
    "accepted": [
      {
        "sha256": "6fb9d3e5a63518ad9ffe1127caa85b25044c07d055b3d060924db51a359ae469",
        "origins": [
          {
            "sourceRecordSha256": "5a228f0f966daec07eccac310537f442ab3ffe3b009404eda9d0ae3ecfb22568",
            "jsonPointer": "/files/369",
            "phase": "actual sealed648 full source"
          },
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/10/acceptedBefore/0/sha256"
          },
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/10/acceptedBefore/1/sha256"
          }
        ]
      }
    ]
  },
  {
    "path": "src/renderer/SceneRendererEnvironment.ts",
    "accepted": [
      {
        "sha256": "c521f71956efbf78904fa2c4ccef3ab8591edb0db1c4e23e41547216262aa537",
        "origins": [
          {
            "sourceRecordSha256": "5a228f0f966daec07eccac310537f442ab3ffe3b009404eda9d0ae3ecfb22568",
            "jsonPointer": "/files/351",
            "phase": "actual sealed648 full source"
          },
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/9/acceptedBefore/0/sha256"
          },
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/9/acceptedBefore/1/sha256"
          }
        ]
      }
    ]
  },
  {
    "path": "src/runtime/GameplayRuntimeCore.ts",
    "accepted": [
      {
        "sha256": "65f6d9c0f696d07ba834b6d18115a8b1fbfcb14288ffd4de727b8edd531df44e",
        "origins": [
          {
            "sourceRecordSha256": "5a228f0f966daec07eccac310537f442ab3ffe3b009404eda9d0ae3ecfb22568",
            "jsonPointer": "/files/376",
            "phase": "actual sealed648 full source"
          },
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/3/acceptedBefore/13/sha256"
          }
        ]
      },
      {
        "sha256": "542e3b20b7993155f742f1f199816b683bb122a5202d148c4126c4f85066ed37",
        "origins": [
          {
            "fixture": "scripts/lib/fixtures/tileMapOwner.contract.json",
            "fixtureSha256": "ae2a47a40c1215ace116116f867944b101a3af1bcd80836d05f4020c4ba140ad",
            "jsonPointer": "/candidateFiles/6/beforeSha256"
          },
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/3/acceptedBefore/0/sha256"
          }
        ]
      },
      {
        "sha256": "796d7bc1915054fe9afa91f3738e72c958ff2dad21809fa358f40505314ea6dd",
        "origins": [
          {
            "fixture": "scripts/lib/fixtures/tileMapOwner.contract.json",
            "fixtureSha256": "ae2a47a40c1215ace116116f867944b101a3af1bcd80836d05f4020c4ba140ad",
            "jsonPointer": "/candidateFiles/6/approvedHistoricalBeforeSha256/0"
          },
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/3/acceptedBefore/1/sha256"
          }
        ]
      },
      {
        "sha256": "12e49ac5decc7baff824e1ebed42ffa509bbd36f029795b89b2d371ac7c0384c",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/3/acceptedBefore/2/sha256"
          }
        ]
      },
      {
        "sha256": "0a78ac0f3ef0b8051c3be6c585d7d0e926b576629b8d84a34f936c34d79e19cd",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/3/acceptedBefore/3/sha256"
          }
        ]
      },
      {
        "sha256": "e40d72df8b6f9137c8deec2bceec9e5162e9aba21924b42a96af1d1c0f685916",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/3/acceptedBefore/4/sha256"
          }
        ]
      },
      {
        "sha256": "5b382ceb1d2b1e1acc089cf12305c156514dfa6dbc911c6a510547f40fb0972f",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/3/acceptedBefore/5/sha256"
          }
        ]
      },
      {
        "sha256": "dea68e5f26e088cfeac6a6e0cec0a4a6cbd9b7cbbf93819a0ccca54946d0adbd",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/3/acceptedBefore/6/sha256"
          }
        ]
      },
      {
        "sha256": "827f7c77ec67d7610845592e7501a982fa64eebe5a4514318069798e71fe18b2",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/3/acceptedBefore/7/sha256"
          }
        ]
      },
      {
        "sha256": "0622330d62a617a63f67a781931e8bb6b68c0d34f028137a6298c7017db2930d",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/3/acceptedBefore/8/sha256"
          }
        ]
      },
      {
        "sha256": "15938eb890f05a56611d98a613c389a6f9a1450ea87154e00f80e3a34058183d",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/3/acceptedBefore/9/sha256"
          }
        ]
      },
      {
        "sha256": "a3ad6d2583a947f5cd29a0714b3ec489f4cab3223a97346cb2a987f3c26b765e",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/3/acceptedBefore/10/sha256"
          }
        ]
      },
      {
        "sha256": "6158ab3f84237a0c658a4ded13a3a3473873063adaa45ccae225f8d9982b99c3",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/3/acceptedBefore/11/sha256"
          }
        ]
      },
      {
        "sha256": "feeac7b450afd6d0d29120b510230a31226d6ae028f3760c02d921ce41242d2b",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/3/acceptedBefore/12/sha256"
          }
        ]
      }
    ]
  },
  {
    "path": "src/runtime/gameplayWorldHost.ts",
    "accepted": [
      {
        "sha256": "7758c6fde94b856c8fef9a82c6c8764e0b6c82e0087854972fa43d44b33a2160",
        "origins": [
          {
            "sourceRecordSha256": "5a228f0f966daec07eccac310537f442ab3ffe3b009404eda9d0ae3ecfb22568",
            "jsonPointer": "/files/432",
            "phase": "actual sealed648 full source"
          },
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/4/acceptedBefore/0/sha256"
          },
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/4/acceptedBefore/10/sha256"
          }
        ]
      },
      {
        "sha256": "272ec3ae1fbc5fcb334da670f650cf2651c7ffd7b54b8f0f294c6b4d829d888c",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/4/acceptedBefore/1/sha256"
          }
        ]
      },
      {
        "sha256": "00591eea981f84e2779ee3679a2b255c00de0e897692e664909623d02ec8db7e",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/4/acceptedBefore/2/sha256"
          }
        ]
      },
      {
        "sha256": "fc3240fb48899904d23ea7ec19871abe001768959b6ed5458bfd0f42ee9011ab",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/4/acceptedBefore/3/sha256"
          }
        ]
      },
      {
        "sha256": "0a42f4308e9cdf5834b93a239ec0909979f687c5b4ad4027424ff2592e74eab8",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/4/acceptedBefore/4/sha256"
          }
        ]
      },
      {
        "sha256": "0b50b947c481aad1c7706782f69f403581b9185f309d1f95f0670386d8ae9d89",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/4/acceptedBefore/5/sha256"
          }
        ]
      },
      {
        "sha256": "7e44fbaadf121e0d67a8d3227e097cb58c1be381379728b445419d21c0275b28",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/4/acceptedBefore/6/sha256"
          }
        ]
      },
      {
        "sha256": "304dc4d4e7d5205f908f9bb0ba0a49432581516fd893a1fba321a527f274f6c8",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/4/acceptedBefore/7/sha256"
          }
        ]
      },
      {
        "sha256": "4f86ee7cb5f0aeb12aef6735aeb0f62b5e451316116924c979d9a29544e93111",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/4/acceptedBefore/8/sha256"
          }
        ]
      },
      {
        "sha256": "8dd0186963800f5f5c284102dbab5ec6ea31933ecd50c99b920b279305828039",
        "origins": [
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/4/acceptedBefore/9/sha256"
          }
        ]
      }
    ]
  },
  {
    "path": "src/runtime/particles.ts",
    "accepted": [
      {
        "sha256": "b5d82afd65ca088a79c14530fd5df86d8e7269b229efb21830f0617a548372d7",
        "origins": [
          {
            "sourceRecordSha256": "5a228f0f966daec07eccac310537f442ab3ffe3b009404eda9d0ae3ecfb22568",
            "jsonPointer": "/files/464",
            "phase": "actual sealed648 full source"
          },
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/1/acceptedBefore/0/sha256"
          },
          {
            "fixture": "scripts/fixtures/particle-owner-transform-v1.json",
            "fixtureSha256": "5eeef56ece66da2bf9a939c11d1de0b55387f53ace6e9ab212766ab2a4c66814",
            "jsonPointer": "/files/1/acceptedBefore/1/sha256"
          }
        ]
      }
    ]
  },
  {
    "path": "src/runtime/runtimeSceneInstantiator.ts",
    "accepted": [
      {
        "sha256": "8e6b81c8552469152de887a8d2916efdf0a76954e84d64bc7b590ff44d2194b1",
        "origins": [
          {
            "sourceRecordSha256": "5a228f0f966daec07eccac310537f442ab3ffe3b009404eda9d0ae3ecfb22568",
            "jsonPointer": "/files/645",
            "phase": "actual sealed648 full source"
          }
        ]
      }
    ]
  },
  {
    "path": "src/runtime/sceneInstances.ts",
    "accepted": [
      {
        "sha256": "120d76034f90daec6efe18e62d52b3cea7f494965d12b489623c6f5b199f91d9",
        "origins": [
          {
            "sourceRecordSha256": "5a228f0f966daec07eccac310537f442ab3ffe3b009404eda9d0ae3ecfb22568",
            "jsonPointer": "/files/517",
            "phase": "actual sealed648 full source"
          }
        ]
      },
      {
        "sha256": "08698484d93bc7e297a50d6c63f7b41012ae1cbfeb70d62e43c975c13d917993",
        "origins": [
          {
            "fixture": "scripts/lib/fixtures/tileMapOwner.contract.json",
            "fixtureSha256": "ae2a47a40c1215ace116116f867944b101a3af1bcd80836d05f4020c4ba140ad",
            "jsonPointer": "/candidateFiles/1/beforeSha256"
          }
        ]
      }
    ]
  },
  {
    "path": "src/runtime/tilemap.ts",
    "accepted": [
      {
        "sha256": "30026c777569fcca4648c1197a4a4d34b6b0d2d8fa145ef9f3726f553c7d04ef",
        "origins": [
          {
            "sourceRecordSha256": "5a228f0f966daec07eccac310537f442ab3ffe3b009404eda9d0ae3ecfb22568",
            "jsonPointer": "/files/543",
            "phase": "actual sealed648 full source"
          }
        ]
      },
      {
        "sha256": "be221c6564cd847586cdbb84b68de99418a47a7128540ff1f39c007f838bf090",
        "origins": [
          {
            "fixture": "scripts/lib/fixtures/tileMapOwner.contract.json",
            "fixtureSha256": "ae2a47a40c1215ace116116f867944b101a3af1bcd80836d05f4020c4ba140ad",
            "jsonPointer": "/candidateFiles/0/beforeSha256"
          }
        ]
      }
    ]
  },
  {
    "path": "src/runtime/tileMapOwner.ts",
    "accepted": [
      {
        "sha256": "d0fc919ee72bc48dc0f806a0f543b5301e9ed6d7a07b9bf95d88bcd93145a47c",
        "origins": [
          {
            "sourceRecordSha256": "5a228f0f966daec07eccac310537f442ab3ffe3b009404eda9d0ae3ecfb22568",
            "jsonPointer": "/files/644",
            "phase": "actual sealed648 full source"
          }
        ]
      }
    ]
  },
  {
    "path": "src/runtime/tileSceneOwner.ts",
    "accepted": [
      {
        "sha256": "e75a97b74ade86038f851474350b8ae4ae57262f2538fc67bc558af581b09ca8",
        "origins": [
          {
            "sourceRecordSha256": "5a228f0f966daec07eccac310537f442ab3ffe3b009404eda9d0ae3ecfb22568",
            "jsonPointer": "/files/646",
            "phase": "actual sealed648 full source"
          }
        ]
      }
    ]
  },
  {
    "path": "src/runtime/tileSceneRuntime.ts",
    "accepted": [
      {
        "sha256": "e2d6f8ec17ec03246723ffd8bd4b2f964ea1bad897fed96c6c98e87819041ae5",
        "origins": [
          {
            "sourceRecordSha256": "5a228f0f966daec07eccac310537f442ab3ffe3b009404eda9d0ae3ecfb22568",
            "jsonPointer": "/files/542",
            "phase": "actual sealed648 full source"
          }
        ]
      },
      {
        "sha256": "719a33c1fd9afcc927b0e2a221ea30f982a3b15b306e32c7b74229e00405eec3",
        "origins": [
          {
            "fixture": "scripts/lib/fixtures/tileMapOwner.contract.json",
            "fixtureSha256": "ae2a47a40c1215ace116116f867944b101a3af1bcd80836d05f4020c4ba140ad",
            "jsonPointer": "/candidateFiles/2/beforeSha256"
          }
        ]
      }
    ]
  },
  {
    "path": "src/runtime/tileSetValues.ts",
    "accepted": [
      {
        "sha256": "fa9a1a5a1d835b598009f72262c7e7a1e33b69fe803a8911b4bdcb0e541190f7",
        "origins": [
          {
            "sourceRecordSha256": "5a228f0f966daec07eccac310537f442ab3ffe3b009404eda9d0ae3ecfb22568",
            "jsonPointer": "/files/643",
            "phase": "actual sealed648 full source"
          }
        ]
      }
    ]
  },
  {
    "path": "src/runtime/worldGameplayOwner.ts",
    "accepted": [
      {
        "sha256": "ce73c1b7aaeaddee368217295d1614fc15c043d3cf966a8b7bec1e63e46bf5e1",
        "origins": [
          {
            "sourceRecordSha256": "5a228f0f966daec07eccac310537f442ab3ffe3b009404eda9d0ae3ecfb22568",
            "jsonPointer": "/files/561",
            "phase": "actual sealed648 full source"
          }
        ]
      },
      {
        "sha256": "1d54d5073000a06c165059393092a0429981b39b61c60df5b6a2def9f86b4b84",
        "origins": [
          {
            "fixture": "scripts/lib/fixtures/tileMapOwner.contract.json",
            "fixtureSha256": "ae2a47a40c1215ace116116f867944b101a3af1bcd80836d05f4020c4ba140ad",
            "jsonPointer": "/candidateFiles/4/beforeSha256"
          }
        ]
      }
    ]
  },
  {
    "path": "src/store/physics.ts",
    "accepted": [
      {
        "sha256": "5c8c607f9178793fc1ac7878904e9dfc3575c6ffd639e86ee30a85625dd6de2f",
        "origins": [
          {
            "sourceRecordSha256": "5a228f0f966daec07eccac310537f442ab3ffe3b009404eda9d0ae3ecfb22568",
            "jsonPointer": "/files/568",
            "phase": "actual sealed648 full source"
          }
        ]
      },
      {
        "sha256": "c308b6f582588ec24bafe49da261ccfdd503d9b3444398b6d1a6fe77bb2b437c",
        "origins": [
          {
            "fixture": "scripts/lib/fixtures/tileMapOwner.contract.json",
            "fixtureSha256": "ae2a47a40c1215ace116116f867944b101a3af1bcd80836d05f4020c4ba140ad",
            "jsonPointer": "/candidateFiles/7/beforeSha256"
          }
        ]
      }
    ]
  },
  {
    "path": "src/visual/graphDebugger.ts",
    "accepted": [
      {
        "sha256": "78138b67c6b4a15e16b69ed44d85a38f208c49fad613f0098611647c73d37f84",
        "origins": [
          {
            "sourceRecordSha256": "5a228f0f966daec07eccac310537f442ab3ffe3b009404eda9d0ae3ecfb22568",
            "jsonPointer": "/files/594",
            "phase": "actual sealed648 full source"
          }
        ]
      }
    ]
  }
]
const hashes=new Map(history.map(r=>[r.path,new Set(r.accepted.map(h=>h.sha256))])),sha=s=>createHash('sha256').update(s).digest('hex'),key=p=>p.replaceAll('\\','/')
const read=(provider,p)=>{assert.equal(typeof provider,'function','LATEST_LINKED_PROVIDER_REQUIRED');const source=provider(p);assert.equal(typeof source,'string',p+': synchronous full linked source required');return source}
export function graphParticleHistoricalSourceEvidence(){return history}
export function canonicalBeforeGraphParticle(path,source,readLinkedSource){
 path=key(path);assert.equal(typeof source,'string');source=canonicalBeforeNetworkSources(path,source,readLinkedSource);if(hashes.get(path)?.has(sha(source)))return source
 const raw=p=>canonicalBeforeNetworkSources(p,read(readLinkedSource,p),readLinkedSource),graph=p=>canonicalBeforeGraphDebugOwner(p,raw(p),raw)
 const selected=canonicalBeforeGraphDebugOwner(path,source,raw)
 const result=canonicalBeforeParticleOwner(selected,path,p=>p===path?selected:graph(p))
 if(hashes.has(path))assert(hashes.get(path).has(sha(result)),path+': unapproved whole source after latest projection')
 return result
}
export function createGraphParticleSourceReader(readSource){assert.equal(typeof readSource,'function','LATEST_LINKED_PROVIDER_REQUIRED');return path=>canonicalBeforeGraphParticle(path,read(readSource,path),readSource)}
/** Fresh actual post-cohort gate; historical readers intentionally use the exact-SHA normalizer above. */
export function createVerifiedGraphParticleSourceReader(readSource){
 assert.equal(typeof readSource,'function','LATEST_LINKED_PROVIDER_REQUIRED')
 const graph=assertGraphDebugOwnerQualification(readSource),particle=validateParticleOwner(readSource)
 assert.equal(graph.sourceFiles,9);assert.equal(particle.sourceFiles,11)
 return createGraphParticleSourceReader(readSource)
}
